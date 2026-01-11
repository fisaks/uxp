import { BlueprintUploadResponse } from "@uhn/common";
import { AppErrorV2, AppLogger, Token } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";
import { BlueprintMapper } from "../mappers/blueprint.mapper";
import { BlueprintActivationRepository } from "../repositories/blueprint-activation.repository";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { BlueprintCompileUtil } from "../util/blueprint-compiler.util";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { BlueprintMetaDataUtil } from "../util/blueprint-metadata.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { systemConfigService } from "./system-config.service";

type BlueprintEventMap = {
    blueprintActivating: [identifier: string, version: number, by: string];
    blueprintInstalled: [identifier: string, version: number];
    blueprintCompileFailed: [identifier: string, version: number, errorSummary?: string];
    blueprintDeactivating: [identifier: string, version: number, by: string];
    noActiveBlueprint: [];
};

class BlueprintService extends EventEmitter<BlueprintEventMap> {

    async uploadBlueprint(request: FastifyRequest) {
        const upload = await BlueprintFileUtil.handleAndValidateUpload(request);
        const user = request.user as Token

        const metadata = await BlueprintMetaDataUtil.readBlueprintMetadataFromZip(upload.zipPath);
        const version = await BlueprintRepository.getNextBlueprintVersion(metadata.identifier)

        const { blueprintZip } = await BlueprintFileUtil.moveAndOrganizeUploadedBlueprint(upload.zipPath, upload.fileType, metadata.identifier, version);

        const blueprintEntity = new BlueprintEntity({
            identifier: metadata.identifier,
            name: metadata.name,
            version: version,
            zipPath: blueprintZip,
            status: 'idle',
            metadata: metadata,
            active: false,
            uploadedBy: user.username,

        });
        const newBlueprint = await BlueprintRepository.save(blueprintEntity)

        AppLogger.info({
            message: `Uploaded blueprint ${metadata.name} with identifier ${metadata.identifier} version ${version} and internal id ${newBlueprint.id}`,
        });

        return { identifier: metadata.identifier, version } satisfies BlueprintUploadResponse;
    }


    async deactivateBlueprint(identifier: string, version: number, deActivatedBy: string) {

        const toDeactivate = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);
        if (!toDeactivate) {
            this.emit("noActiveBlueprint");
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        if (toDeactivate.active === false) {
            return toDeactivate;
        }
        this.emit("blueprintDeactivating", identifier, version, deActivatedBy);

        await BlueprintFileUtil.removeActiveBlueprint();

        toDeactivate.active = false;
        toDeactivate.status = 'idle';
        const deactivatedAt = DateTime.now();
        toDeactivate.lastDeactivatedAt = deactivatedAt;
        toDeactivate.lastDeactivatedBy = deActivatedBy;
        await BlueprintRepository.save(toDeactivate);
        // close activation period
        const lastActivation = await BlueprintActivationRepository.findLastActiveForBlueprint(toDeactivate.id)

        if (lastActivation) {
            lastActivation.deactivatedAt = deactivatedAt;
            lastActivation.deactivatedBy = deActivatedBy;
            await BlueprintActivationRepository.save(lastActivation);
        }
        await blueprintRuntimeSupervisorService.stop();
        this.emit("noActiveBlueprint");
        AppLogger.info({
            message: `Deactivated blueprint ${identifier} v${version} globally by ${deActivatedBy}`
        });

        return toDeactivate;
    }

    async activateBlueprint(identifier: string, version: number, activatedBy: string) {

        this.emit("blueprintActivating", identifier, version, activatedBy);
        const toActivate = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);
        if (!toActivate) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        const currentlyActive = await BlueprintRepository.findActive();

        let error: unknown = undefined
        try {
            const folder = await BlueprintFileUtil.prepareBlueprintWorkdir();
            await BlueprintFileUtil.extractBlueprintToDir(toActivate.zipPath, folder);
        } catch (err) {
            error = err
        }
        toActivate.status = error ? "extraction_failed" : "extracted";
        toActivate.compileLog = null;
        toActivate.installLog = null;
        toActivate.errorSummary = null;
        await BlueprintRepository.save(toActivate);
        if (error) {
            throw error;
        }
        const debugMode = systemConfigService.getConfig().runtimeMode === 'debug';
        const compile = await BlueprintCompileUtil.compileBlueprint({
            blueprintFolder: BlueprintFileUtil.WorkBlueprintFolder,
            identifier: toActivate.identifier,
            debugMode,
        });
        toActivate.status = compile.success ? "compiled" : "compile_failed";
        toActivate.compileLog = compile.compileLog;
        toActivate.installLog = compile.installLog;
        toActivate.errorSummary = compile.errorSummary;
        await BlueprintRepository.save(toActivate);
        if (!compile.success) {
            this.emit("blueprintCompileFailed", identifier, version, compile.errorSummary);
            if (!currentlyActive)
                this.emit("noActiveBlueprint");
            return toActivate;
        }
        const activatedAt = DateTime.now();

        await blueprintRuntimeSupervisorService.stop();
        await BlueprintFileUtil.swapActiveBlueprint();

        if (currentlyActive && currentlyActive.id !== toActivate.id) {
            currentlyActive.active = false;
            currentlyActive.status = "idle";
            currentlyActive.lastDeactivatedAt = activatedAt;
            currentlyActive.lastDeactivatedBy = activatedBy;
            await BlueprintRepository.save(currentlyActive);

            const lastActivation =
                await BlueprintActivationRepository.findLastActiveForBlueprint(
                    currentlyActive.id
                );

            if (lastActivation) {
                lastActivation.deactivatedAt = activatedAt;
                lastActivation.deactivatedBy = activatedBy;
                await BlueprintActivationRepository.save(lastActivation);
            }
        }

        toActivate.active = true;
        toActivate.status = "compiled";
        toActivate.lastActivatedAt = activatedAt;
        toActivate.lastActivatedBy = activatedBy;
        toActivate.lastDeactivatedAt = undefined;
        toActivate.lastDeactivatedBy = undefined;

        await BlueprintRepository.save(toActivate);

        const activation = new BlueprintActivationEntity({
            blueprint: toActivate,
            activatedAt,
            activatedBy,
        });
        await BlueprintActivationRepository.save(activation);

        // Start runtime
        await blueprintRuntimeSupervisorService.start();

        this.emit("blueprintInstalled", identifier, version);

        AppLogger.info({
            message: `Activated blueprint ${identifier} v${version} globally by ${activatedBy}`
        });

        return toActivate;
    }

    /**
     * For startup to initialize runtime from active blueprint in DB
     */
    async initializeRuntimeFromState() {
        const active = await BlueprintRepository.findActive();

        if (
            active &&
            active.active &&
            active.status === "compiled" &&
            await BlueprintFileUtil.activeBlueprintExists()
        ) {
            this.emit("blueprintInstalled", active.identifier, active.version);
            AppLogger.info({
                message: `Starting blueprint runtime for ${active.identifier} v${active.version}`,
            });

            try {
                await blueprintRuntimeSupervisorService.start();

            } catch (error) {

                throw new AppErrorV2({
                    statusCode: 500,
                    code: "BLUEPRINT_ACTIVATION_FAILED",
                    message: `Failed to start blueprint runtime for active blueprint ${active.identifier} v${active.version}`,
                    originalError: error instanceof Error ? error : undefined,
                });
            }
        } else {
            this.emit("noActiveBlueprint");
        }
    }

    /**
     * Delete a blueprint version.
     */
    async deleteBlueprint(identifier: string, version: number, deletedBy: string) {

        const blueprint = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);
        if (!blueprint) {
            return { identifier, version }
        }
        if (blueprint.active) {
            throw new AppErrorV2({ statusCode: 400, code: "ACTIVE_BLUEPRINT_DELETE_FORBIDDEN", message: "Cannot delete active blueprint version" });
        }

        await BlueprintFileUtil.deleteBlueprintZip(blueprint.zipPath);
        await BlueprintRepository.remove(blueprint);

        AppLogger.info({
            message: `Deleted blueprint ${identifier} v${version} by ${deletedBy}`,
        });

        return { identifier, version };
    }

    /**
     * List all blueprints, grouped and sorted for UI.
     * Returns: Array<{ identifier, name, versions: BlueprintEntity[] }>
     */
    async listBlueprints(): Promise<Array<{ identifier: string, name: string, versions: BlueprintEntity[] }>> {
        const all = await BlueprintRepository.findAllSorted();

        const grouped: Record<string, { identifier: string, name: string, versions: BlueprintEntity[] }> = {};
        for (const bp of all) {
            if (!grouped[bp.identifier]) {
                grouped[bp.identifier] = { identifier: bp.identifier, name: bp.name, versions: [] };
            }
            grouped[bp.identifier].versions.push(bp);
        }
        return Object.values(grouped);
    }

    async getActivationLogForVersion(identifier: string, version: number) {

        const blueprint = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);
        if (!blueprint) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "RESOURCE_NOT_FOUND",
                message: `Blueprint ${identifier} v${version} not found`,
            });
        }

        const activations = await BlueprintActivationRepository.findAllForBlueprint(blueprint.id)

        return activations.map(a => (BlueprintMapper.toBlueprintActivationDetail(blueprint, a)));
    }

    async getActivationLogs(limit: number = 100) {

        const activations = await BlueprintActivationRepository.findAll(limit);

        return activations.map(a => BlueprintMapper.toBlueprintActivationDetail(a.blueprint, a));
    }

    async getLogForVersion(identifier: string, version: number) {
        const blueprint = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);
        if (!blueprint) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "RESOURCE_NOT_FOUND",
                message: `Blueprint ${identifier} v${version} not found`,
            });
        }

        return BlueprintMapper.toBlueprintVersionLog(blueprint);
    }

    async getBlueprintVersionStream(identifier: string, version: number) {
        const blueprint = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);

        if (!blueprint) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        return {
            mimeType: "application/zip",
            name: `${identifier}-v${version}.zip`,
            stream: await BlueprintFileUtil.getBlueprintStream(blueprint.zipPath)
        }
    }

}

export const blueprintService = new BlueprintService();