import { AppLogger, Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { ActivateBlueprintSchema, DeleteBlueprintVersionSchema, DownloadBlueprintSchema, ListActivationsForVersionSchema, ListActivationsSchema } from "@uhn/common";
import { QueryRunner } from "typeorm/query-runner/QueryRunner";
import { BlueprintMapper } from "../mappers/blueprint.mapper";
import { BlueprintService } from "../services/blueprint.service";

export class BlueprintController {
    private fastify: FastifyInstance;
    private blueprintService: BlueprintService;
    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
        this.blueprintService = new BlueprintService();
    }

    @Route("post", "/upload-blueprint", { authenticate: true, roles: ["admin"] })
    @UseQueryRunner({ transactional: true })
    async uploadBlueprint(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {

        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint upload initiated by ${user.username}` });

        return await this.blueprintService.uploadBlueprint(req);
    }

    @Route("post", "/blueprints/:identifier/:version/activate", { authenticate: true, roles: ["admin"], schema: ActivateBlueprintSchema })
    @UseQueryRunner({ transactional: true })
    async activateBlueprint(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was activated by ${user.username}` });

        const result = await this.blueprintService.activateBlueprint(identifier, version, user.username);
        return BlueprintMapper.toBlueprintVersion(result);
    }

    @Route("post", "/blueprints/:identifier/:version/deactivate", { authenticate: true, roles: ["admin"], schema: ActivateBlueprintSchema })
    @UseQueryRunner({ transactional: true })
    async deactivateBlueprint(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was deactivated by ${user.username}` });

        const result = await this.blueprintService.deactivateBlueprint(identifier, version, user.username);
        return BlueprintMapper.toBlueprintVersion(result);
    }

    @Route("delete", "/blueprints/:identifier/:version", { authenticate: true, roles: ["admin"], schema: DeleteBlueprintVersionSchema })
    @UseQueryRunner({ transactional: true })
    async deleteBlueprint(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const { identifier, version } = req.params as { identifier: string, version: number };

        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was deleted by ${user.username}` });

        return await this.blueprintService.deleteBlueprint(identifier, version, user.username);
    }

    @Route("get", "/blueprints", { authenticate: true, roles: ["admin"] })
    @UseQueryRunner({ transactional: false })
    async listBlueprints(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const groups = await this.blueprintService.listBlueprints();
        // Map to DTO structure
        return groups.map(group => ({
            identifier: group.identifier,
            name: group.name,
            versions: group.versions.map(BlueprintMapper.toBlueprintVersion)
        }));
    }

    @Route("get", "/blueprints/activations", { authenticate: true, roles: ["admin"], schema: ListActivationsSchema })
    @UseQueryRunner({ transactional: false })
    async getAllBlueprintActivations(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const { limit } = req.query as { limit?: number };
        return await this.blueprintService.getActivationLogs(limit);
    }


    @Route("get", "/blueprints/:identifier/:version/activations", {
        authenticate: true, roles: ["admin"], schema: ListActivationsForVersionSchema
    })
    @UseQueryRunner({ transactional: false })
    async getBlueprintActivationLog(
        req: FastifyRequest,
        _reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        return await this.blueprintService.getActivationLogForVersion(identifier, version);
    }

    @Route("get", "/blueprints/:identifier/:version/download", { authenticate: true, roles: ["admin"], schema: DownloadBlueprintSchema })
    @UseQueryRunner({ transactional: false })
    async downloadBlueprint(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was downloaded ${user.username}` });

        const { mimeType, name, stream } = await this.blueprintService.getBlueprintVersionStream(identifier, version);
        reply.header("Content-Type", mimeType);
        reply.header("Content-Disposition", `attachment; filename="${name}"`);
        stream.on('error', err => {
            reply.status(500).send({ error: "Failed to read blueprint file" });
        });
        return reply.send(stream);

    }

}
