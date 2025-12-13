import { BlueprintActivationDetails, BlueprintFileTypes, BlueprintUploadResponse, UhnFileType } from "@uhn/common";
import { AppErrorV2, AppLogger, ensureDir, extractZip, handleMultipartUpload, moveFile, pathExists, removeFile, RequestMetaData, Token } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import fs from "fs-extra";
import { DateTime } from "luxon";
import path from "path";
import { IsNull, QueryRunner } from "typeorm";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";
import env from "../env";
import { readBlueprintMetadataFromZip } from "../util/blueprint.util";
import { BlueprintFileService } from "./blueprint-file.service";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { BlueprintActivationRepository } from "../repositories/blueprint-activation.repository";
import { find } from "lodash";


export class BlueprintService {
    private queryRunner: QueryRunner;
    private requestMeta: RequestMetaData;
    private fileService: BlueprintFileService;
    private blueprintRepo: BlueprintRepository
    private activationRepo: BlueprintActivationRepository

    constructor(requestMeta: FastifyRequest | RequestMetaData, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;
        this.fileService = new BlueprintFileService(this.requestMeta);
        this.blueprintRepo = new BlueprintRepository(queryRunner);
        this.activationRepo = new BlueprintActivationRepository(queryRunner);
    }

    async uploadBlueprint(request: FastifyRequest) {
        const upload = await this.fileService.handleAndValidateUpload(request);
        const user = request.user as Token

        //const zipFilepath = path.join(PreFlightFolder, file.filename);
        const metadata = await readBlueprintMetadataFromZip(upload.zipPath);
        const version = await this.blueprintRepo.getNextBlueprintVersion(metadata.identifier)

        const { blueprintZip } = await this.fileService.moveAndOrganizeUploadedBlueprint(upload.zipPath, upload.fileType, metadata.identifier, version);


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
        const newBlueprint = await this.blueprintRepo.save(blueprintEntity)

        AppLogger.info(this.requestMeta, {
            message: `Uploaded blueprint ${metadata.name} with identifier ${metadata.identifier} version ${version} and internal id ${newBlueprint.id}`,
        });

        return { identifier: metadata.identifier, version } satisfies BlueprintUploadResponse;
    }


    async deactivateBlueprint(identifier: string, version: number, deActivatedBy: string) {

        const toDeactivate = await this.blueprintRepo.findByIdentifierAndVersion(identifier, version);
        if (!toDeactivate) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        if (toDeactivate.active === false) {
            return toDeactivate;
        }
        await this.fileService.removeActiveBluePrint();
    
        toDeactivate.active = false;
        const deactivatedAt = DateTime.now();
        toDeactivate.lastDeactivatedAt = deactivatedAt;
        toDeactivate.lastDeactivatedBy = deActivatedBy;
        await this.blueprintRepo.save(toDeactivate);
        // close activation period
        const lastActivation = await this.activationRepo.findLastActiveForBlueprint(toDeactivate.id)
     
        if (lastActivation) {
            lastActivation.deactivatedAt = deactivatedAt;
            lastActivation.deactivatedBy = deActivatedBy;
            await this.activationRepo.save(lastActivation);
        }

        AppLogger.info(this.requestMeta, {
            message: `Deactivated blueprint ${identifier} v${version} globally by ${deActivatedBy}`
        });

        return toDeactivate;
    }

    async activateBlueprint(identifier: string, version: number, activatedBy: string) {
    
        const toActivate = await this.blueprintRepo.findByIdentifierAndVersion(identifier,version);
        if (!toActivate) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint ${identifier} v${version} not found` });
        }

        // Find globally active blueprint
        const currentlyActive = await this.blueprintRepo.findActive();

        // If another blueprint is active, deactivate it
        if (currentlyActive && currentlyActive.id !== toActivate.id) {
            currentlyActive.active = false;
            const deactivatedAt = DateTime.now();
            currentlyActive.lastDeactivatedAt = deactivatedAt;
            currentlyActive.lastDeactivatedBy = activatedBy;
            await this.blueprintRepo.save(currentlyActive);

            // close activation period
            const lastActivation = await this.activationRepo.findLastActiveForBlueprint(currentlyActive.id);
         
            if (lastActivation) {
                lastActivation.deactivatedAt = deactivatedAt;
                lastActivation.deactivatedBy = activatedBy;
                await this.activationRepo.save(lastActivation);
            }
        }
        this.fileService.activateBlueprint(toActivate.zipPath);

        // Activate new version
        toActivate.active = true;
        toActivate.status = 'installed';
        const activatedAt = DateTime.now();
        toActivate.lastActivatedAt = activatedAt;
        toActivate.lastActivatedBy = activatedBy;
        toActivate.lastDeactivatedAt = undefined;
        toActivate.lastDeactivatedBy = undefined;
        await this.blueprintRepo.save(toActivate);

        // Create activation record
        const activation = new BlueprintActivationEntity({
            blueprint: toActivate,
            activatedAt: activatedAt,
            activatedBy
        });
        await this.activationRepo.save(activation);

        AppLogger.info(this.requestMeta, {
            message: `Activated blueprint ${identifier} v${version} globally by ${activatedBy}`
        });

        return toActivate;
    }

    /**
     * Delete a blueprint version.
     */
    async deleteBlueprint(identifier: string, version: number, deletedBy: string) {
        
        const blueprint = await this.blueprintRepo.findByIdentifierAndVersion(identifier,version);
        if(!blueprint) {
            return {identifier,version}
        }
        if (blueprint.active) {
            throw new AppErrorV2({ statusCode: 400, code: "ACTIVE_BLUEPRINT_DELETE_FORBIDDEN", message: "Cannot delete active blueprint version" });
        }

        await this.fileService.deleteBlueprintZip(blueprint.zipPath);
        await this.blueprintRepo.remove(blueprint);

        AppLogger.info(this.requestMeta, {
            message: `Deleted blueprint ${identifier} v${version} by ${deletedBy}`,
        });
     
        return { identifier, version };
    }

    /**
     * List all blueprints, grouped and sorted for UI.
     * Returns: Array<{ identifier, name, versions: BlueprintEntity[] }>
     */
    async listBlueprints(): Promise<Array<{ identifier: string, name: string, versions: BlueprintEntity[] }>> {
           const all = await this.blueprintRepo.findAllSorted();
           
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
    
        const blueprint = await this.blueprintRepo.findByIdentifierAndVersion(identifier,version);
        if (!blueprint) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "RESOURCE_NOT_FOUND",
                message: `Blueprint ${identifier} v${version} not found`,
            });
        }

        const activations = await this.activationRepo.findAllForBlueprint(blueprint.id)

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
      
        const activations = await this.activationRepo.findAll(limit);

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