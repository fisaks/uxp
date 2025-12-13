import { BlueprintActivationDetails, BlueprintUploadResponse } from "@uhn/common";
import { AppErrorV2, AppLogger, Token } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";
import { BlueprintActivationRepository } from "../repositories/blueprint-activation.repository";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { readBlueprintMetadataFromZip } from "../util/blueprint.util";


export class BlueprintService {

    async uploadBlueprint(request: FastifyRequest) {
        const upload = await BlueprintFileUtil.handleAndValidateUpload(request);
        const user = request.user as Token

        //const zipFilepath = path.join(PreFlightFolder, file.filename);
        const metadata = await readBlueprintMetadataFromZip(upload.zipPath);
        const version = await BlueprintRepository.getNextBlueprintVersion(metadata.identifier)

        const { blueprintZip } = await BlueprintFileUtil.moveAndOrganizeUploadedBlueprint(upload.zipPath, upload.fileType, metadata.identifier, version);


        // TODO move this to activation
        //const sourceDir = path.join(blueprintFolder, "source");
        //await extractZip(blueprintZip, sourceDir);
        //const compiledDir = path.join(blueprintFolder, "compiled");
        // await compileBlueprint(sourceDir, compiledDir);
        const blueprintEntity = new BlueprintEntity({
            identifier: metadata.identifier,
            name: metadata.name,
            version: version,
            zipPath: blueprintZip,
            status: 'uploaded',
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
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        if (toDeactivate.active === false) {
            return toDeactivate;
        }
        await BlueprintFileUtil.removeActiveBlueprint();

        toDeactivate.active = false;
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

        AppLogger.info({
            message: `Deactivated blueprint ${identifier} v${version} globally by ${deActivatedBy}`
        });

        return toDeactivate;
    }

    async activateBlueprint(identifier: string, version: number, activatedBy: string) {

        const toActivate = await BlueprintRepository.findByIdentifierAndVersion(identifier, version);
        if (!toActivate) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        // Find globally active blueprint
        const currentlyActive = await BlueprintRepository.findActive();

        // If another blueprint is active, deactivate it
        if (currentlyActive && currentlyActive.id !== toActivate.id) {
            currentlyActive.active = false;
            const deactivatedAt = DateTime.now();
            currentlyActive.lastDeactivatedAt = deactivatedAt;
            currentlyActive.lastDeactivatedBy = activatedBy;
            await BlueprintRepository.save(currentlyActive);

            // close activation period
            const lastActivation = await BlueprintActivationRepository.findLastActiveForBlueprint(currentlyActive.id);

            if (lastActivation) {
                lastActivation.deactivatedAt = deactivatedAt;
                lastActivation.deactivatedBy = activatedBy;
                await BlueprintActivationRepository.save(lastActivation);
            }
        }
        await BlueprintFileUtil.activateBlueprint(toActivate.zipPath);

        // Activate new version
        toActivate.active = true;
        toActivate.status = 'installed';
        const activatedAt = DateTime.now();
        toActivate.lastActivatedAt = activatedAt;
        toActivate.lastActivatedBy = activatedBy;
        toActivate.lastDeactivatedAt = undefined;
        toActivate.lastDeactivatedBy = undefined;
        await BlueprintRepository.save(toActivate);

        // Create activation record
        const activation = new BlueprintActivationEntity({
            blueprint: toActivate,
            activatedAt: activatedAt,
            activatedBy
        });
        await BlueprintActivationRepository.save(activation);

        AppLogger.info({
            message: `Activated blueprint ${identifier} v${version} globally by ${activatedBy}`
        });

        return toActivate;
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

        return activations.map(a => ({
            identifier: blueprint.identifier,
            version: blueprint.version,
            activatedAt: a.activatedAt.toISO()!,
            activatedBy: a.activatedBy,
            deactivatedAt: a.deactivatedAt?.toISO?.() ?? undefined,
            deactivatedBy: a.deactivatedBy,
        } satisfies BlueprintActivationDetails));
    }

    async getActivationLogs(limit: number = 100) {

        const activations = await BlueprintActivationRepository.findAll(limit);

        return activations.map(a => ({
            identifier: a.blueprint.identifier,
            version: a.blueprint.version,
            activatedAt: a.activatedAt.toISO(),
            activatedBy: a.activatedBy,
            deactivatedAt: a.deactivatedAt?.toISO?.(),
            deactivatedBy: a.deactivatedBy,
        }));
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