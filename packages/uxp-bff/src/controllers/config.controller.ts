import { Route, UseQueryRunner } from "@uxp/bff-common";
import { ApplyConfigSchema } from "@uxp/common";
import { SerializablePlatformConfig } from "@uxp/config";
import { FastifyReply, FastifyRequest } from "fastify";
import { ConfigApplyService } from "../services/config-apply.service";
import { requireApiKey } from "../utils/requireApiKey";

export class ConfigController {
    @Route("post", "/cli/apply-config", { authenticate: false, schema: ApplyConfigSchema })
    @UseQueryRunner({ transactional: true })
    async applyConfigEndpoint(req: FastifyRequest, reply: FastifyReply) {
        requireApiKey(req, "UXP_CONFIG_API_KEY");

        const config = req.body as SerializablePlatformConfig;
        const stats = await ConfigApplyService.applyConfig(config);

        return reply.status(200).send({ success: true, stats });
    }
}
