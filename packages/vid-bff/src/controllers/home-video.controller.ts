import { Route } from "@uxp/bff-common";
import { HomeVideoClip, HomeVideoClipParams, HomeVideoClipParamsSchema, HomeVideoClipUpdate, HomeVideoClipUpdateSchema, HomeVideoLabels } from "@vid/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { homeVideoService } from "../home-video/home-video.service";

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
}
