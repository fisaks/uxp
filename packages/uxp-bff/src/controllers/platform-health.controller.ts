import { AppErrorV2, Route, UseQueryRunner } from "@uxp/bff-common";
import { HealthKeyParams, HealthKeyParamsSchema, UpsertHealthBody, UpsertHealthSchema } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { PlatformHealthService } from "../services/platform-health.service";
import { runTlsCertCheck } from "../services/health-checks/tls-cert.check";
import { requireApiKey } from "../utils/requireApiKey";

export class PlatformHealthController {
    @Route("get", "/cli/platform-health", { authenticate: false })
    async getHealth(req: FastifyRequest, reply: FastifyReply) {
        requireApiKey(req, "UXP_HEALTH_API_KEY");
        reply.send(PlatformHealthService.getSnapshot());
    }

    @Route("post", "/cli/platform-health", { authenticate: false, schema: UpsertHealthSchema })
    @UseQueryRunner({ transactional: true })
    async upsertHealth(req: FastifyRequest<{ Body: UpsertHealthBody }>, reply: FastifyReply) {
        requireApiKey(req, "UXP_HEALTH_API_KEY");

        const { key, severity, message, details, source } = req.body;
        await PlatformHealthService.upsert(key, severity, message, details, source ?? "external");
        reply.status(204).send();
    }

    @Route("delete", "/cli/platform-health/:key", { authenticate: false, schema: HealthKeyParamsSchema })
    @UseQueryRunner()
    async removeHealth(req: FastifyRequest<{ Params: HealthKeyParams }>, reply: FastifyReply) {
        requireApiKey(req, "UXP_HEALTH_API_KEY");

        await PlatformHealthService.remove(req.params.key);
        reply.status(204).send();
    }

    /** Admin — manually recheck a health item (silent — no email notifications) */
    @Route("post", "/platform-health/recheck/:key", { authenticate: true, roles: ["admin"], schema: HealthKeyParamsSchema })
    @UseQueryRunner()
    async recheckHealth(req: FastifyRequest<{ Params: HealthKeyParams }>, reply: FastifyReply) {
        const key = req.params.key;

        if (key === "tls-cert") {
            const config = await PlatformHealthService.getTlsCertConfig();
            if (!config?.enabled) {
                throw new AppErrorV2({ statusCode: 400, code: "SERVICE_NOT_CONFIGURED", message: "TLS cert check is not enabled" });
            }
            const result = await runTlsCertCheck(config);
            await PlatformHealthService.upsert(key, result.severity, result.message, result.details, result.source, true);
        }

        reply.send(PlatformHealthService.getSnapshot());
    }
}
