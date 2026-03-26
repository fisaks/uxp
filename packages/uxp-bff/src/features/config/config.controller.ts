import { AppErrorV2, Route, UseQueryRunner } from "@uxp/bff-common";
import { ApplyConfigSchema } from "@uxp/common";
import { SerializablePlatformConfig } from "@uxp/config";
import { FastifyReply, FastifyRequest } from "fastify";
import env from "../../config/env";
import { ConfigApplyService } from "../../services/config-apply.service";

export class ConfigController {
    @Route("post", "/system/apply-config", { authenticate: false, schema: ApplyConfigSchema })
    @UseQueryRunner({ transactional: true })
    async applyConfigEndpoint(req: FastifyRequest, reply: FastifyReply) {
        const apiKey = env.UXP_CONFIG_API_KEY;
        if (!apiKey) {
            throw new AppErrorV2({
                statusCode: 500,
                code: "INTERNAL_SERVER_ERROR",
                message: "UXP_CONFIG_API_KEY is not configured",
            });
        }

        const authHeader = req.headers["authorization"];
        if (!authHeader?.startsWith("Bearer ")) {
            throw new AppErrorV2({
                statusCode: 401,
                code: "UNAUTHORIZED",
                message: "Missing Authorization header",
            });
        }

        const key = authHeader.slice("Bearer ".length);
        if (key !== apiKey) {
            throw new AppErrorV2({
                statusCode: 401,
                code: "UNAUTHORIZED",
                message: "Invalid API key",
            });
        }

        const config = req.body as SerializablePlatformConfig;
        const stats = await ConfigApplyService.applyConfig(config);

        return reply.status(200).send({ success: true, stats });
    }
}
