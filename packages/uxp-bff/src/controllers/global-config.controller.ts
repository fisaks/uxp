import { AppErrorV2, Route, UseQueryRunner } from "@uxp/bff-common";
import {
    GlobalConfigPayload,
    PatchGlobalConfigSchema,
    FullGlobalConfigResponse,
    PublicGlobalConfigResponse,
} from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { GlobalConfigService } from "../services/global-config.service";
import { UserService } from "../services/user.service";

export class GlobalConfigController {
    @Route("get", "/global-settings/public", { authenticate: false })
    @UseQueryRunner()
    async getPublicGlobalSettings(req: FastifyRequest, reply: FastifyReply) {
        const result = await GlobalConfigService.getPublicConfig();

        if (!result) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: "No existing configuration found" });
        }

        reply.send(result as PublicGlobalConfigResponse);
    }

    @Route("get", "/global-settings/full", { authenticate: true, roles: ["admin"] })
    @UseQueryRunner()
    async getFullGlobalSettings(req: FastifyRequest, reply: FastifyReply) {
        const result = await GlobalConfigService.getFullConfig();

        if (!result) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: "No existing configuration found" });
        }

        reply.send(result as FullGlobalConfigResponse);
    }

    @Route("patch", "/global-settings", { authenticate: true, roles: ["admin"], schema: PatchGlobalConfigSchema })
    @UseQueryRunner({ transactional: true })
    async patchGlobalSettings(req: FastifyRequest<{ Body: GlobalConfigPayload }>, reply: FastifyReply) {
        const { key, value } = req.body;
        const loggedInUser = UserService.getLoggedInUser(req);

        await GlobalConfigService.patchConfig(key, value, loggedInUser!.username);

        reply.status(204).send();
    }
}
