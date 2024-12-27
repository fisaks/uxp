import { buildPath, buildUrlWithParams, ErrorCodes } from "@uxp/common";
import axios from "axios";
import { FastifyReply, FastifyRequest } from "fastify";
import { JSDOM } from "jsdom";
import { QueryRunner } from "typeorm";
import { PageAppsEntity } from "../../db/entities/PageAppsEntity";
import { UseQueryRunner } from "../../decorator/queryrunner.decorator";
import { Route } from "../../decorator/route.decorator";
import { AppLogger } from "../../utils/AppLogger";
import { sendErrorResponse } from "../../utils/errorUtils";

export class RemoteController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/content/index/:uuid", { authenticate: false })
    @UseQueryRunner()
    async getContentIndex(
        req: FastifyRequest<{ Params: { uuid: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuid } = req.params;

        const pageApps = (await queryRunner.manager
            .getRepository(PageAppsEntity)
            .createQueryBuilder("pageApps")
            .leftJoinAndSelect("pageApps.app", "app")
            .where("pageApps.uuid = :uuid", { uuid })
            .getOne()) as PageAppsEntity | null;

        if (!pageApps) {
            AppLogger.info(req, { message: "Page app not found %s", args: [uuid] });
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.RESOURCE_NOT_FOUND,
                message: "Page app not found",
                statusCode: 404,
            });
        }
        const config = { ...(pageApps.app.config ?? {}), ...(pageApps.config ?? {}) };
        const { contextPath, indexPage } = config;
        const { baseUrl } = pageApps.app;
        const targetUrl = buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [indexPage] });
        AppLogger.info(req, { message: `Remote target url is ${targetUrl}` });

        try {
            // Fetch the original index.html from the backend app

            const response = await axios.get(targetUrl, {
                headers: {
                    ...req.headers,
                },
            });
            const originalHtml = response.data;

            const dom = new JSDOM(originalHtml);
            const document = dom.window.document;
            const rewriteUrl = (url: string): string => {
                if (url.startsWith("http") || url.startsWith("//")) return url; // Absolute URLs
                return buildPath("/api/content/resource", uuid, url);
            };

            // Update script, link,
            document.querySelectorAll("script[src]").forEach((script) => {
                if (script.getAttribute("data-uxp-libs") === "true") {
                    script.remove();
                } else {
                    script.setAttribute("src", rewriteUrl(script.getAttribute("src")!));
                }
            });
            document.querySelectorAll("link[href]").forEach((link) => {
                if (link.getAttribute("data-uxp-libs") === "true") {
                    link.remove();
                } else {
                    link.setAttribute("href", rewriteUrl(link.getAttribute("href")!));
                }
            });

            const divs = document.querySelectorAll("body div");

            // Iterate over all divs
            divs.forEach((div) => {
                // Get all attributes of the div
                Array.from(div.attributes).forEach((attr) => {
                    // Check if the attribute name starts with "data-base-url"
                    if (attr.name.startsWith("data-base-url")) {
                        // Rewrite the attribute value
                        const originalValue = attr.value;
                        div.setAttribute(attr.name, buildPath("/api/content/resource", uuid, originalValue));
                    }
                });
            });

            return reply.type(response.headers["Content-Type"]?.toString() ?? "text/html").send(dom.serialize());
        } catch (error) {
            AppLogger.error(req, {
                message: `Failed to fetch or rewrite index.html for UUID: ${uuid}`,
                error: error as Error,
                object: { targetUrl },
            });
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "Failed to fetch or rewrite index.html",
                statusCode: 500,
            });
        }
    }

    @Route("all", "/content/resource/:uuid/*", { authenticate: false })
    @UseQueryRunner()
    async executeContentResource(
        req: FastifyRequest<{ Params: { uuid: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuid } = req.params;

        const resourcePath = req.raw.url!.replace(`/api/content/resource/${uuid}/`, "");

        const pageApps = (await queryRunner.manager
            .getRepository(PageAppsEntity)
            .createQueryBuilder("pageApps")
            .leftJoinAndSelect("pageApps.app", "app")
            .where("pageApps.uuid = :uuid", { uuid })
            .getOne()) as PageAppsEntity | null;

        if (!pageApps) {
            AppLogger.info(req, { message: "Page app not found %s", args: [uuid] });
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.RESOURCE_NOT_FOUND,
                message: "Page app not found",
                statusCode: 404,
            });
        }

        try {
            // Fetch the resource from the backend app
            const config = { ...(pageApps.app.config ?? {}), ...(pageApps.config ?? {}) };
            const { contextPath, indexPage } = config;
            const { baseUrl } = pageApps.app;
            const targetUrl = buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [resourcePath] });
            AppLogger.info(req, { message: `Remote url is ${targetUrl}` });

            const response = await axios({
                method: req.method, // Forward the method (GET, POST, etc.)
                url: targetUrl,
                headers: req.headers, // Forward headers
                data: req.body, // Forward the body for methods like POST or PUT
                responseType: "stream", // Stream the response back to the client
            });

            // Proxy the response
            // Send the proxied response back to the client

            const headers = Object.fromEntries(
                Object.entries(response.headers).map(([key, value]) => [key, value ?? undefined])
            );
            //reply.headers(headers);
            reply.raw.writeHead(response.status, headers);
            //return reply.send(response.data);
            response.data.pipe(reply.raw);
        } catch (error) {
            return reply.status(500).send({ error: "Failed to fetch resource" });
        }
    }
}
