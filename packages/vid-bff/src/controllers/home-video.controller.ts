import { AppErrorV2, AppLogger, Route } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import {
    HomeVideoClip,
    HomeVideoClipParams,
    HomeVideoClipParamsSchema,
    HomeVideoClipUpdate,
    HomeVideoClipUpdateSchema,
    HomeVideoLabels,
    HomeVideoSearchQuery,
    HomeVideoSearchResult,
    HomeVideoSearchSchema,
    HomeVideoStreamLink,
    HomeVideoStreamQuery,
    HomeVideoStreamSchema,
} from "@vid/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { homeVideoService } from "../home-video/home-video.service";
import { sendVideoFile } from "../stream/send-video-file";
import { isValidStreamQuery, signStreamQuery } from "../stream/signed-url";

const ONE_DAY_SECONDS = 24 * 60 * 60;

const noSuchClip = () => new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such clip", params: { resource: "clip" } });
const searchUnavailable = () => new AppErrorV2({ statusCode: 503, code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "Search is not available" });
const invalidLink = () => new AppErrorV2({ statusCode: 403, code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });

export class HomeVideoController {
    @Route("get", "/home-videos/clips", { authenticate: true })
    async getClips(): Promise<HomeVideoClip[]> {
        return homeVideoService.list();
    }

    @Route("get", "/home-videos/labels", { authenticate: true })
    async getLabels(): Promise<HomeVideoLabels> {
        return homeVideoService.labels();
    }

    /** The ids of the clips that match the words, best match first. */
    @Route("get", "/home-videos/search", { authenticate: true, schema: HomeVideoSearchSchema })
    async search(req: FastifyRequest<{ Querystring: HomeVideoSearchQuery }>): Promise<HomeVideoSearchResult> {
        if (!homeVideoService.search.available) {
            throw searchUnavailable();
        }
        try {
            return { ids: await homeVideoService.search.find(req.query.q) };
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] The search failed", error });
            throw searchUnavailable();
        }
    }

    @Route("get", "/home-videos/clips/:id", { authenticate: true, schema: HomeVideoClipParamsSchema })
    async getClip(req: FastifyRequest<{ Params: HomeVideoClipParams }>): Promise<HomeVideoClip> {
        const clip = homeVideoService.get(req.params.id);
        if (!clip) {
            throw noSuchClip();
        }
        return clip;
    }

    @Route("patch", "/home-videos/clips/:id", { authenticate: true, schema: HomeVideoClipUpdateSchema })
    async updateClip(req: FastifyRequest<{ Params: HomeVideoClipParams; Body: HomeVideoClipUpdate }>): Promise<HomeVideoClip> {
        return homeVideoService.update(req.params.id, req.body);
    }

    /** The poster frame of a clip. Found by clip id, so no path is ever taken from the request. */
    @Route("get", "/home-videos/clips/:id/thumbnail", { authenticate: true, schema: HomeVideoClipParamsSchema })
    async getThumbnail(req: FastifyRequest<{ Params: HomeVideoClipParams }>, reply: FastifyReply) {
        const made = homeVideoService.thumbnail(req.params.id);
        if (!made) {
            throw noSuchClip();
        }
        return this.sendPoster(reply, made);
    }

    /** The poster frame for a Chromecast, which has no cookie. Allowed by the same signature as the stream. */
    @Route("get", "/home-videos/poster/:id", { authenticate: false, schema: HomeVideoStreamSchema })
    async getSignedPoster(req: FastifyRequest<{ Params: HomeVideoClipParams; Querystring: HomeVideoStreamQuery }>, reply: FastifyReply) {
        const { id } = req.params;
        const { exp, sig } = req.query;
        if (!isValidStreamQuery(id, exp, sig)) {
            throw invalidLink();
        }
        const made = homeVideoService.thumbnail(id);
        if (!made) {
            throw noSuchClip();
        }
        return this.sendPoster(reply, made);
    }

    private async sendPoster(reply: FastifyReply, made: Promise<string>) {
        let file: string;
        try {
            file = await made;
        } catch {
            throw new AppErrorV2({ statusCode: 500, code: ErrorCodes.INTERNAL_SERVER_ERROR, message: "The poster frame could not be made" });
        }
        reply.header("Content-Type", "image/jpeg");
        reply.header("Cache-Control", `private, max-age=${ONE_DAY_SECONDS}`);
        return reply.send(createReadStream(file));
    }

    /** A link to the stream that works without the cookie, for the browser player and for a Chromecast. */
    @Route("post", "/home-videos/clips/:id/stream-link", { authenticate: true, schema: HomeVideoClipParamsSchema })
    async createStreamLink(req: FastifyRequest<{ Params: HomeVideoClipParams }>): Promise<HomeVideoStreamLink> {
        const { id } = req.params;
        if (!homeVideoService.get(id)) {
            throw noSuchClip();
        }
        const { exp, sig } = signStreamQuery(id);
        return { path: `/api/home-videos/stream/${id}?exp=${exp}&sig=${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
    }

    /** The video itself, with range requests so it can be seeked. Allowed by the signature, not the cookie. */
    @Route("get", "/home-videos/stream/:id", { authenticate: false, schema: HomeVideoStreamSchema })
    async stream(req: FastifyRequest<{ Params: HomeVideoClipParams; Querystring: HomeVideoStreamQuery }>, reply: FastifyReply) {
        const { id } = req.params;
        const { exp, sig } = req.query;
        if (!isValidStreamQuery(id, exp, sig)) {
            throw invalidLink();
        }
        return sendVideoFile(req, reply, homeVideoService.filePath(id));
    }
}
