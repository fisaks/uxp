import { BlueprintActivationDetails, BlueprintFileTypes, BlueprintUploadResponse, UhnFileType } from "@uhn/common";
import { AppErrorV2, AppLogger, ensureDir, handleMultipartUpload, moveFile, pathExists, removeFile, RequestMetaData, Token } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import fs from "fs-extra";
import { DateTime } from "luxon";
import path from "path";
import { IsNull, QueryRunner } from "typeorm";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";
import env from "../env";
import { readBlueprintMetadataFromZip } from "../util/blueprint.util";

const PreFlightFolder = path.join(env.UHN_FILE_UPLOAD_PATH, ".pre-flight");

export class BlueprintService {
    private queryRunner: QueryRunner;
    private requestMeta: RequestMetaData;
    constructor(requestMeta: FastifyRequest | RequestMetaData, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;
    }

    async uploadBlueprint(request: FastifyRequest) {
        const files = await handleMultipartUpload<UhnFileType>(request, PreFlightFolder, BlueprintFileTypes);
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);
        const user = (request.user as Token)
        if (files.files.length === 0) {
            throw new AppErrorV2({ statusCode: 400, code: "NO_FILES_UPLOADED", message: "No blueprint files uploaded" });
        }
        if (files.files.length > 1) {
            throw new AppErrorV2({ statusCode: 400, code: "ONLY_SINGLE_FILE_ALLOWED", message: "Multiple blueprint files uploaded, only one is allowed" });
        }
        const file = files.files[0];
        if (file.mimetype !== "application/zip") {
            throw new AppErrorV2({ statusCode: 400, code: "INVALID_FILE_TYPE", message: "Invalid blueprint file type, only zip files are allowed" });
        }

        const zipFilepath = path.join(PreFlightFolder, file.filename);
        const metadata = await readBlueprintMetadataFromZip(zipFilepath);
        const version = await this.getNextBlueprintVersion(metadata.identifier);

        const blueprintFolder = path.join(env.UHN_FILE_UPLOAD_PATH, files.fileType, metadata.identifier, `v${version}`)
        const blueprintZip = path.join(blueprintFolder, `${metadata.identifier}-v${version}.zip`);
        await ensureDir(blueprintFolder);
        await moveFile(zipFilepath, blueprintZip);
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
        const newBlueprint = await blueprintRepo.save(blueprintEntity);
        AppLogger.info(this.requestMeta, {
            message: `Uploaded blueprint ${metadata.name} with identifier ${metadata.identifier} version ${version} and internal id ${newBlueprint.id}`,
        });

        return { identifier: metadata.identifier, version } satisfies BlueprintUploadResponse;
    }

    private async getNextBlueprintVersion(identifier: string): Promise<number> {
        const repo = this.queryRunner.manager.getRepository(BlueprintEntity);

        const last = await repo.findOne({
            where: { identifier },
            order: { version: 'DESC' },
        });

        return last ? last.version + 1 : 1;
    }

    async deactivateBlueprint(identifier: string, version: number, deActivatedBy: string) {
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);
        const activationRepo = this.queryRunner.manager.getRepository(BlueprintActivationEntity);

        // Find blueprint to deactivate
        const toDeactivate = await blueprintRepo.findOne({ where: { identifier, version } });
        if (!toDeactivate) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        if (toDeactivate.active === false) {
            return toDeactivate;
        }
        toDeactivate.active = false;
        const deactivatedAt = DateTime.now();
        toDeactivate.lastDeactivatedAt = deactivatedAt;
        toDeactivate.lastDeactivatedBy = deActivatedBy;
        await blueprintRepo.save(toDeactivate);
        // close activation period
        const lastActivation = await activationRepo.findOne({
            where: { blueprint: { id: toDeactivate.id }, deactivatedAt: IsNull() },
            order: { activatedAt: "DESC" }
        });

        if (lastActivation) {
            lastActivation.deactivatedAt = deactivatedAt;
            lastActivation.deactivatedBy = deActivatedBy;
            await activationRepo.save(lastActivation);
        }



        AppLogger.info(this.requestMeta, {
            message: `Deactivated blueprint ${identifier} v${version} globally by ${deActivatedBy}`
        });

        return toDeactivate;
    }

    async activateBlueprint(identifier: string, version: number, activatedBy: string) {
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);
        const activationRepo = this.queryRunner.manager.getRepository(BlueprintActivationEntity);

        // Find blueprint to activate
        const toActivate = await blueprintRepo.findOne({ where: { identifier, version } });
        if (!toActivate) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        // Find globally active blueprint
        const currentlyActive = await blueprintRepo.findOne({ where: { active: true } });

        // If another blueprint is active, deactivate it
        if (currentlyActive && currentlyActive.id !== toActivate.id) {
            currentlyActive.active = false;
            const deactivatedAt = DateTime.now();
            currentlyActive.lastDeactivatedAt = deactivatedAt;
            currentlyActive.lastDeactivatedBy = activatedBy;
            await blueprintRepo.save(currentlyActive);

            // close activation period
            const lastActivation = await activationRepo.findOne({
                where: { blueprint: { id: currentlyActive.id }, deactivatedAt: IsNull() },
                order: { activatedAt: "DESC" }
            });

            if (lastActivation) {
                lastActivation.deactivatedAt = deactivatedAt;
                lastActivation.deactivatedBy = activatedBy;
                await activationRepo.save(lastActivation);
            }
        }

        // Activate new version
        toActivate.active = true;
        toActivate.status = 'installed';
        const activatedAt = DateTime.now();
        toActivate.lastActivatedAt = activatedAt;
        toActivate.lastActivatedBy = activatedBy;
        toActivate.lastDeactivatedAt = undefined;
        toActivate.lastDeactivatedBy = undefined;
        await blueprintRepo.save(toActivate);

        // Create activation record
        const activation = activationRepo.create({
            blueprint: toActivate,
            activatedAt: activatedAt,
            activatedBy
        });
        await activationRepo.save(activation);

        AppLogger.info(this.requestMeta, {
            message: `Activated blueprint ${identifier} v${version} globally by ${activatedBy}`
        });

        return toActivate;
    }

    /**
     * Delete a blueprint version.
     */
    async deleteBlueprint(identifier: string, version: number, deletedBy: string) {
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);

        const blueprint = await blueprintRepo.findOneOrFail({ where: { identifier, version } });
        if (blueprint.active) {
            throw new AppErrorV2({ statusCode: 400, code: "ACTIVE_BLUEPRINT_DELETE_FORBIDDEN", message: "Cannot delete active blueprint version" });
        }

        await blueprintRepo.remove(blueprint);

        AppLogger.info(this.requestMeta, {
            message: `Deleted blueprint ${identifier} v${version} by ${deletedBy}`,
        });

        await removeFile(blueprint.zipPath).catch(err => {
            AppLogger.warn(this.requestMeta, {
                message: `Failed to delete blueprint file at ${blueprint.zipPath}: ${err.message}`,
            });
        });
        return { identifier, version };
    }

    /**
     * List all blueprints, grouped and sorted for UI.
     * Returns: Array<{ identifier, name, versions: BlueprintEntity[] }>
     */
    async listBlueprints(): Promise<Array<{ identifier: string, name: string, versions: BlueprintEntity[] }>> {
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);
        const all = await blueprintRepo.find({ order: { identifier: "ASC", version: "DESC" } });

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
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);
        const activationRepo = this.queryRunner.manager.getRepository(BlueprintActivationEntity);

        const blueprint = await blueprintRepo.findOne({ where: { identifier, version } });
        if (!blueprint) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "RESOURCE_NOT_FOUND",
                message: `Blueprint ${identifier} v${version} not found`,
            });
        }

        const activations = await activationRepo.find({
            where: { blueprint: { id: blueprint.id } },
            order: { activatedAt: "DESC" },
        });

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
        const activationRepo = this.queryRunner.manager.getRepository(BlueprintActivationEntity);

        const activations = await activationRepo.find({
            relations: ["blueprint"],
            order: { activatedAt: "DESC" },
            take: limit,
        });

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
        const blueprintRepo = this.queryRunner.manager.getRepository(BlueprintEntity);
        const blueprint = await blueprintRepo.findOne({ where: { identifier, version } });

        if (!blueprint) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }


        if (!(await pathExists(blueprint.zipPath))) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint file for ${identifier} v${version} not found on disk` });
        }
        return {
            mimeType: "application/zip",
            name: `${identifier}-v${version}.zip`,
            stream: fs.createReadStream(blueprint.zipPath)
        }
    }

}