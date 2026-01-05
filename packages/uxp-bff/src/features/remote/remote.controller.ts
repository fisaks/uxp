import { AppLogger, Route, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { RemoteAppService } from "../../services/remote-app.service";

export class RemoteController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/content/index/:uuid", { authenticate: false })
    @UseQueryRunner()
    async getContentIndex(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply) {
        const { uuid } = req.params;

        const config = await RemoteAppService.getRemoteAppConfigurationForContent(uuid);
        const targetUrl = RemoteAppService.getTargetUrlForMainEntry(config);
        AppLogger.info(req, { message: `Remote target url is ${targetUrl}` });

        const response = await RemoteAppService.fetchRemoteAppEntryHtml({
            targetUrl,
            headers: req.headers,
            config
        });
        return reply.type(response.contentType).send(response.body);
    }

    @Route("all", "/content/resource/:appIdentifier/*", { authenticate: false })
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
