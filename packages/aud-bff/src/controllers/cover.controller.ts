import { Collection, CoverParams, CoverSchema } from "@aud/common";
import { Route } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import path from "path";
import { LibraryService, audiobookService, libraryService } from "../library/library.service";

const CONTENT_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };
const LIBRARIES: Record<Collection, LibraryService> = { music: libraryService, audiobooks: audiobookService };
const ONE_DAY_SECONDS = 24 * 60 * 60;

export class CoverController {
    /** The cover picture of an album or an audiobook. Only files the scanner picked are served, found by collection and album id, so an id that is not an album is a 404 and no path is ever taken from the request. */
    @Route("get", "/cover/:collection/:albumId", { authenticate: true, schema: CoverSchema })
    async getCover(req: FastifyRequest, reply: FastifyReply) {
        const { collection, albumId } = req.params as CoverParams;
        const file = LIBRARIES[collection].getCoverFile(albumId);
        if (!file) {
            return reply.status(404).send({ error: "The album has no cover" });
        }
        const stream = createReadStream(file);
        stream.on("error", () => reply.status(404).send({ error: "The cover could not be read" }));
        reply.header("Content-Type", CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream");
        // The cover of an album does not change often, and a list of albums loads many of them.
        reply.header("Cache-Control", `private, max-age=${ONE_DAY_SECONDS}`);
        return reply.send(stream);
    }
}
