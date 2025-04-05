import { AppLogger, Route, sendErrorResponse, UseQueryRunner } from "@uxp/bff-common";
import { buildPath, buildUrlWithParams, ErrorCodes, removeContextPath } from "@uxp/common";
import axios, { AxiosError } from "axios";
import { FastifyReply, FastifyRequest } from "fastify";
import { JSDOM } from "jsdom";
import { QueryRunner } from "typeorm";
import { AppEntity } from "../../db/entities/AppEntity";
import { PageAppsEntity } from "../../db/entities/PageAppsEntity";

export class RemoteController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/content/index/:uuid", { authenticate: false })
    @UseQueryRunner()
    async getContentIndex(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
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
        const { baseUrl, identifier: appIdentifier } = pageApps.app;
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
                return buildPath("/api/content/resource", appIdentifier, removeContextPath(url, contextPath));
            };

            document.querySelectorAll("script:not([src])").forEach((script) => {
                if (script.getAttribute("data-uxp-remove") === "true") {
                    script.remove();
                }
            });

            // Update script, link,
            document.querySelectorAll("script[src]").forEach((script) => {
                if (script.getAttribute("data-uxp-remove") === "true") {
                    script.remove();
                } else {
                    script.setAttribute("src", rewriteUrl(script.getAttribute("src")!));
                }
            });
            document.querySelectorAll("link[href]").forEach((link) => {
                if (link.getAttribute("data-uxp-remove") === "true") {
                    link.remove();
                } else {
                    link.setAttribute("href", rewriteUrl(link.getAttribute("href")!));
                }
            });

            const divs = document.querySelectorAll("body div");

            // Iterate over all divs
            divs.forEach((div) => {
                // data-base-url is required fo the root div of the remote app
                if (div.hasAttribute("data-base-url")) {
                    // Get all attributes of the div
                    Array.from(div.attributes).forEach((attr) => {
                        // Check if the attribute name starts with "data-base-url"
                        if (attr.name.startsWith("data-base-url")) {
                            // Rewrite the attribute value
                            const originalValue = attr.value;
                            div.setAttribute(
                                attr.name,
                                buildPath("/api/content/resource", appIdentifier, removeContextPath(originalValue, contextPath))
                            );
                        }
                        if (attr.name.startsWith("data-ws-path")) {
                            div.setAttribute(
                                attr.name,
                                buildPath("/ws-api", appIdentifier)
                            );
                        }
                    });
                    // Additionally the data-base-route-path attribute is set in RemoteApp.tsx
                    // which point to the current base navigation path of the page
                    div.setAttribute("data-uxp-content-id", uuid);
                    div.setAttribute("data-uxp-app-identifier", appIdentifier);

                    if (config.appOption) {
                        // Exisiting appOption is overwritten
                        div.setAttribute("data-app-option", JSON.stringify(config.appOption));
                    }

                }

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

    @Route("all", "/content/resource/:appIdentifier/*", { authenticate: false })
    @UseQueryRunner()
    async executeContentResource(
        req: FastifyRequest<{ Params: { appIdentifier: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { appIdentifier } = req.params;

        const fullPath = req.raw.url!.replace(`/api/content/resource/${appIdentifier}/`, "");
        const [resourcePath, rawQuery] = fullPath.split("?", 2); // Split on first '?'


        const app = (await queryRunner.manager.getRepository(AppEntity).findOneBy({ identifier: appIdentifier })) as AppEntity | null;

        if (!app) {
            AppLogger.info(req, { message: "App not found %s", args: [appIdentifier] });
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.RESOURCE_NOT_FOUND,
                message: "App not found",
                statusCode: 404,
            });
        }

        try {
            // Fetch the resource from the backend app
            const config = { ...(app.config ?? {}) };
            const { contextPath } = config;
            const { baseUrl } = app;
            let targetUrl = buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [resourcePath] });

            if (rawQuery) {
                targetUrl += `?${rawQuery}`; // Append query string manually
            }
            AppLogger.info(req, { message: `Remote url is ${targetUrl}` });

            const reqHeaders = { ...req.headers };
            delete reqHeaders["content-length"];

            const response = await axios({
                method: req.method, // Forward the method (GET, POST, etc.)
                url: targetUrl,
                headers: reqHeaders["content-type"] ? reqHeaders : { ...reqHeaders, "content-type": null }, // Forward headers
                data: req.uxpRaw ? req.raw : req.body,
                // data: req.body, // Forward the body for methods like POST or PUT
                responseType: "stream", // Stream the response back to the client
                validateStatus: (status) => status >= 200 && status < 500, // Only resolve for 2xx status codes
            });

            // Proxy the response
            // Send the proxied response back to the client

            const headers = Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key, value ?? undefined]));
            //reply.headers(headers);
            reply.raw.writeHead(response.status, headers);
            //return reply.send(response.data);
            response.data.pipe(reply.raw);
        } catch (error) {
            AppLogger.error(req, {
                error: error as AxiosError,
                message: `Failed to fetch resource for app ${appIdentifier}`,
            });
            return reply.status(500).send({ error: "Failed to fetch resource" });
        }
    }
}
