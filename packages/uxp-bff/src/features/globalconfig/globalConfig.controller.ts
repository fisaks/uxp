import { Route, UseQueryRunner } from "@uxp/bff-common";
import {
    ErrorCodes,
    GlobalConfigData,
    GlobalConfigPayload,
    GlobalConfigSchema,
    LatestGlobalConfigResponse,
    PatchGlobalConfigResponse,
} from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { QueryRunner } from "typeorm";
import { GlobalConfigEntity } from "../../db/entities/GlobalConfigEntity";
import { UserService } from "../../services/user.service";
import { sendErrorResponse } from "../../utils/errorUtils";

export class GlobalConfigController {
    async findLatestGlobalConfig(queryRunner: QueryRunner) {
        const result = await queryRunner.query(`
            SELECT * 
            FROM global_config 
            WHERE id = (SELECT MAX(id) FROM global_config)
        `);

        if (result.length > 0) {
            const latestConfig = new GlobalConfigEntity();
            Object.assign(latestConfig, result[0]);
            latestConfig.updatedAt = DateTime.fromISO(result[0].updated_at);
            return latestConfig;
        }
        return null;
    }
    @Route("get", "/global-settings/latest", { authenticate: false })
    @UseQueryRunner()
    async getLatestGlobalSettings(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const latestConfig = await this.findLatestGlobalConfig(queryRunner);

        if (!latestConfig) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.NOT_FOUND,
                message: "No existing configuration found",
                statusCode: 404,
            });
        }

        reply.send({
            version: latestConfig.id,
            updatedAt: latestConfig.updatedAt.toISO(),
            config: latestConfig.config,
        } as LatestGlobalConfigResponse);
    }

    @Route("patch", "/global-settings", { authenticate: true, roles: ["admin"], schema: GlobalConfigSchema })
    @UseQueryRunner()
    async patchGlobalSettings(
        req: FastifyRequest<{ Body: GlobalConfigPayload }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { key, value, currentVersion } = req.body;

        const latestConfig = await this.findLatestGlobalConfig(queryRunner);
        const loggedInUser = UserService.getLoggedInUser(req);

        if (latestConfig && latestConfig.id !== currentVersion) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.PATCH_VERSION_CONFLICT,
                message: "Version conflict detected.",
                statusCode: 409,
            });
        }

        const defaultConfig: GlobalConfigData = { siteName: "Unified Experience Platform" };
        const newConfig = new GlobalConfigEntity({
            config: { ...(latestConfig?.config ?? defaultConfig), [key]: value as any },
            updatedBy: loggedInUser!.username,
            updatedAt: DateTime.now(),
        });

        const savedConfig = await queryRunner.manager.save(newConfig);

        reply.send({
            version: savedConfig.id,
            updatedAt: savedConfig.updatedAt.toISO(),
            config: savedConfig.config,
        } as PatchGlobalConfigResponse);
    }
}
