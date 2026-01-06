import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { AppConfigData, buildUrlWithParams, RemoteAppConfiguration } from "@uxp/common";
import axios from "axios";
import { FastifyReply, FastifyRequest } from "fastify";
import { RemoteAppRepository } from "../repositories/remote-app.repository";
import { rewriteAppEntryDom } from "../utils/dom.util";

async function getRemoteAppConfigurationForContent(contentUuid: string) {
    const pageApps = await RemoteAppRepository.getPageAppByContentUuid(contentUuid);
    if (!pageApps) {
        AppLogger.warn({ message: "Page app not found %s", args: [contentUuid] });
        throw new AppErrorV2(
            { statusCode: 404, code: "RESOURCE_NOT_FOUND", message: "Page app not found" });
    }

    const config: AppConfigData = {
        ...pageApps.app.config,
        ...(pageApps.config ?? {})
    };
    const { baseUrl, identifier: appIdentifier } = pageApps.app;

    return {
        appIdentifier,
        baseUrl,
        config,
        contentId: contentUuid
    } satisfies RemoteAppConfiguration;
}

async function getRemoteAppConfiguration(identifier: string) {
    const app = await RemoteAppRepository.getAppByIdentifier(identifier);
    if (!app) {
        AppLogger.warn({ message: "Remote app not found %s", args: [identifier] });
        throw new AppErrorV2(
            { statusCode: 404, code: "RESOURCE_NOT_FOUND", message: "Remote app not found" });
    }

    const { baseUrl, identifier: appIdentifier } = app;

    return {
        appIdentifier,
        baseUrl,
        config: app.config,
    } satisfies RemoteAppConfiguration;
}

function getTargetUrlForMainEntry(config: RemoteAppConfiguration) {
    const { baseUrl, config: { contextPath, mainEntry } } = config
    return buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [mainEntry] });
}
function getTargetUrlForHealthEntry(config: RemoteAppConfiguration) {
    const { baseUrl, config: { contextPath, healthEntry } } = config
    if (!healthEntry) {
        return undefined;
    }
    return buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [healthEntry] });
}

function getTargetUrlForSystemEntry(config: RemoteAppConfiguration) {
    const { baseUrl, config: { contextPath, systemEntry } } = config
    if (!systemEntry) {
        return undefined;
    }
    return buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [systemEntry] });
}

async function fetchRemoteAppEntryHtml(
    { targetUrl, headers, config }: {
        targetUrl: string,
        headers: FastifyRequest["headers"]
        config: RemoteAppConfiguration
    }): Promise<{ body: string, contentType: string }> {

    try {
        const response = await axios.get(targetUrl, {
            headers: {
                ...headers,
            },
        });
        const originalHtml = response.data;
        return {
            body: rewriteAppEntryDom({ html: originalHtml, config }),
            contentType: response.headers["content-type"]?.toString() ?? "text/html"
        }
    } catch (error) {
        AppLogger.error({
            message: `Failed to fetch or rewrite entry html for targetUrl: ${targetUrl}`,
            error: error as Error,
            object: { targetUrl },
        });
        throw new AppErrorV2({
            statusCode: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch or rewrite entry html"
        });
    }
}


async function fetchRemoteAppResource({
    req,
    reply
}: {
    req: FastifyRequest<{ Params: { appIdentifier: string } }>,
    reply: FastifyReply

}) {
    const { appIdentifier } = req.params;

    const app = await RemoteAppRepository.getAppByIdentifier(appIdentifier);
    if (!app) {
        AppLogger.info({ message: "App not found %s", args: [appIdentifier] });
        throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: "App not found" });
    }
    const fullPath = req.raw.url!.replace(`/api/content/resource/${appIdentifier}/`, "");
    const [resourcePath, rawQuery] = fullPath.split("?", 2); // Split on first '?'

    try {
        // Fetch the resource from the backend app
        const { baseUrl, config: { contextPath } } = app;

        let targetUrl = buildUrlWithParams({ hostname: baseUrl, contextPath, resourceParts: [resourcePath] });

        if (rawQuery) {
            targetUrl += `?${rawQuery}`; // Append query string manually
        }
        AppLogger.info({ message: `Remote url is ${targetUrl}` });

        const reqHeaders = { ...req.headers };
        delete reqHeaders["content-length"];

        const response = await axios({
            method: req.method, // Forward the method (GET, POST, etc.)
            url: targetUrl,
            headers: reqHeaders["content-type"] ? reqHeaders : { ...reqHeaders, "content-type": null }, // Forward headers
            data: req.uxpRaw ? req.raw : req.body, //uxpRaw is set for multipart/form-data

            responseType: "stream", // Stream the response back to the client
            validateStatus: (status) => status >= 200 && status < 500, // Only resolve for 2xx status codes
        });

        // Proxy the response
        // Send the proxied response back to the client

        const headers = Object.fromEntries(
            Object.entries(response.headers)
                .map(([key, value]) => [key, value ?? undefined]));
        //reply.headers(headers);
        reply.raw.writeHead(response.status, headers);
        //return reply.send(response.data);
        response.data.pipe(reply.raw);
    } catch (error) {
        AppLogger.error(req, {
            error: error,
            message: `Failed to fetch resource for app ${appIdentifier}`,
        });
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch resource" });

    }

}

export const RemoteAppService = {
    getRemoteAppConfigurationForContent,
    getTargetUrlForMainEntry,
    getTargetUrlForHealthEntry,
    getTargetUrlForSystemEntry,
    fetchRemoteAppEntryHtml,
    fetchRemoteAppResource,
    getRemoteAppConfiguration
};