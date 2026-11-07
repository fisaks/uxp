import { AppLogger, Route } from "@uxp/bff-common";
import { HomeVideoClip, HomeVideoClipParams, HomeVideoClipParamsSchema, HomeVideoClipUpdate, HomeVideoClipUpdateSchema, HomeVideoLabels, HomeVideoSearchQuery, HomeVideoSearchResult, HomeVideoSearchSchema, HomeVideoStreamLink, HomeVideoStreamQuery, HomeVideoStreamSchema } from "@vid/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { homeVideoService } from "../home-video/home-video.service";
import { parseByteRange } from "../stream/byte-range";
import { isValidStreamQuery, signStreamQuery } from "../stream/signed-url";

const ONE_DAY_SECONDS = 24 * 60 * 60;

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
    async search(req: FastifyRequest, reply: FastifyReply): Promise<HomeVideoSearchResult | void> {
        if (!homeVideoService.search.available) {
            return reply.status(503).send({ error: "Search is not available" });
        }
        try {
            return { ids: await homeVideoService.search.find((req.query as HomeVideoSearchQuery).q) };
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] The search failed", error });
            return reply.status(503).send({ error: "Search is not available" });
        }
    }

    @Route("get", "/home-videos/clips/:id", { authenticate: true, schema: HomeVideoClipParamsSchema })
    async getClip(req: FastifyRequest, reply: FastifyReply) {
        const clip = homeVideoService.get((req.params as HomeVideoClipParams).id);
        return clip ?? reply.status(404).send({ error: "There is no such clip" });
    }

    @Route("patch", "/home-videos/clips/:id", { authenticate: true, schema: HomeVideoClipUpdateSchema })
    async updateClip(req: FastifyRequest, reply: FastifyReply) {
        try {
            const clip = homeVideoService.update((req.params as HomeVideoClipParams).id, req.body as HomeVideoClipUpdate);
            return clip ?? reply.status(404).send({ error: "There is no such clip" });
        } catch (error) {
            return reply.status(503).send({ error: (error as Error).message });
        }
    }

    /** The poster frame of a clip. Found by clip id, so no path is ever taken from the request. */
    @Route("get", "/home-videos/clips/:id/thumbnail", { authenticate: true, schema: HomeVideoClipParamsSchema })
    async getThumbnail(req: FastifyRequest, reply: FastifyReply) {
        const made = homeVideoService.thumbnail((req.params as HomeVideoClipParams).id);
        if (!made) {
            return reply.status(404).send({ error: "There is no such clip" });
        }
        let file: string;
        try {
            file = await made;
        } catch {
            return reply.status(500).send({ error: "The poster frame could not be made" });
        }
        reply.header("Content-Type", "image/jpeg");
        reply.header("Cache-Control", `private, max-age=${ONE_DAY_SECONDS}`);
        return reply.send(createReadStream(file));
    }

    /** A link to the stream that works without the cookie, for the browser player and for a Chromecast. */
    @Route("post", "/home-videos/clips/:id/stream-link", { authenticate: true, schema: HomeVideoClipParamsSchema })
    async createStreamLink(req: FastifyRequest, reply: FastifyReply): Promise<HomeVideoStreamLink | void> {
        const { id } = req.params as HomeVideoClipParams;
        if (!homeVideoService.get(id)) {
            return reply.status(404).send({ error: "There is no such clip" });
        }
        const { exp, sig } = signStreamQuery(id);
        return { path: `/api/home-videos/stream/${id}?exp=${exp}&sig=${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
    }

    /** The video itself, with range requests so it can be seeked. Allowed by the signature, not the cookie. */
    @Route("get", "/home-videos/stream/:id", { authenticate: false, schema: HomeVideoStreamSchema })
    async stream(req: FastifyRequest, reply: FastifyReply) {
        const { id } = req.params as HomeVideoClipParams;
        const { exp, sig } = req.query as HomeVideoStreamQuery;
        if (!isValidStreamQuery(id, exp, sig)) {
            return reply.status(403).send({ error: "The link is not valid or has expired" });
        }
        const file = homeVideoService.filePath(id);
        const size = file ? await stat(file).then((s) => s.size).catch(() => undefined) : undefined;
        if (!file || size === undefined) {
            return reply.status(404).send({ error: "There is no such clip" });
        }
        reply.header("Content-Type", "video/mp4");
        reply.header("Accept-Ranges", "bytes");
        reply.header("Cache-Control", "private, no-store");
        const range = parseByteRange(req.headers.range, size);
        if (range === "unsatisfiable") {
            return reply.status(416).header("Content-Range", `bytes */${size}`).send();
        }
        const stream = createReadStream(file, range);
        stream.on("error", () => reply.raw.destroy());
        if (!range) {
            return reply.header("Content-Length", size).send(stream);
        }
        return reply
            .status(206)
            .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`)
            .header("Content-Length", range.end - range.start + 1)
            .send(stream);
    }
}
