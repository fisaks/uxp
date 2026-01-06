import { AppErrorV2, AppLogger, Route, UseQueryRunner } from "@uxp/bff-common";
import { SchemaValidate } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { RemoteAppService } from "../../services/remote-app.service";

export const GetSystemIndexSchema: SchemaValidate<undefined, undefined, { appIdentifier: string, type: "health" | "system" }> = {
    params: {
        type: "object",
        properties: {
            appIdentifier: { type: "string", maxLength: 50 },
            type: { type: "string", enum: ["health", "system"] },
        },
        required: ["appIdentifier", "type"],
    },
};

export class SystemController {

    @Route("get", "/system/index/:appIdentifier/:type", { authenticate: true, schema: GetSystemIndexSchema },)
    @UseQueryRunner()
    async getSystemIndex(
        req: FastifyRequest<{ Params: { appIdentifier: string; type: "health" | "system" } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { appIdentifier, type } = req.params;

        const config = await RemoteAppService.getRemoteAppConfiguration(appIdentifier);

        const targetUrl = type === "health"
            ? RemoteAppService.getTargetUrlForHealthEntry(config)
            : RemoteAppService.getTargetUrlForSystemEntry(config);
        if (!targetUrl) {
            AppLogger.warn(req, { message: `No ${type} entry configured for remote app ${appIdentifier}` });
            throw new AppErrorV2({
                statusCode: 404,
                code: "NOT_FOUND",
                message: `No ${type} entry configured for remote app`
            });
        }
        AppLogger.debug(req, { message: `Remote target url is ${targetUrl}` });

        const response = await RemoteAppService.fetchRemoteAppEntryHtml({
            targetUrl,
            headers: req.headers,
            config
        });
        return reply.type(response.contentType).send(response.body);

    }
}