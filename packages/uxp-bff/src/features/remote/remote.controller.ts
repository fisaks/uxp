import { AppLogger, Route, UseQueryRunner } from "@uxp/bff-common";
import { SchemaValidate } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { RemoteAppService } from "../../services/remote-app.service";


const GetContentIndexSchema: SchemaValidate<undefined, undefined, { uuid: string }> = {
    params: {
        type: "object",
        properties: {
            uuid: { type: "string", format: "uuid" },
        },
        required: ["uuid"],
    },
};

const ExecuteContentResourceSchema: SchemaValidate<undefined, undefined, { appIdentifier: string }> = {
    params: {
        type: "object",
        properties: {
            appIdentifier: { type: "string", maxLength: 50 },
        },
        required: ["appIdentifier"],
    },
};

export class RemoteController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/content/index/:uuid", { authenticate: false, schema: GetContentIndexSchema })
    @UseQueryRunner()
    async getContentIndex(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply) {
        const { uuid } = req.params;

        const config = await RemoteAppService.getRemoteAppConfigurationForContent(uuid);
        const targetUrl = RemoteAppService.getTargetUrlForMainEntry(config);
        AppLogger.debug(req, { message: `Remote target url is ${targetUrl}` });

        const response = await RemoteAppService.fetchRemoteAppEntryHtml({
            targetUrl,
            headers: req.headers,
            config
        });
        return reply.type(response.contentType).send(response.body);
    }

    @Route("all", "/content/resource/:appIdentifier/*", { authenticate: false, schema: ExecuteContentResourceSchema })
    @UseQueryRunner()
    async executeContentResource(
        req: FastifyRequest<{ Params: { appIdentifier: string } }>,
        reply: FastifyReply
    ) {
        await RemoteAppService.fetchRemoteAppResource({
            req,
            reply
        });

    }
}
