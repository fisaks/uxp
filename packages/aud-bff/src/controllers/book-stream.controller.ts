import { BookParams, BookStreamLink, BookStreamLinkSchema, BookStreamQuery, BookStreamSchema } from "@aud/common";
import { AppErrorV2, Route, createStreamSigner, parseByteRange } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { BookStream, NotJoinableError, openBookStream, readBookStream } from "../audiobook/book-stream";
import { audiobookService } from "../library/library.service";

const signer = createStreamSigner("aud-stream");

/** The one mp3 of a book. A phone that is locked cannot start a new request at a part change, so the parts are served as one stream. */
const bookStreamOf = async (albumId: string): Promise<{ parts: { id: string }[]; stream: BookStream }> => {
    const parts = audiobookService.getTracks(albumId);
    const files = parts.map((part) => audiobookService.getTrackFile(part.id));
    if (parts.length === 0 || files.some((file) => file === undefined)) {
        throw new AppErrorV2({ code: ErrorCodes.NOT_FOUND, message: "There is no such audiobook", params: { resource: "audiobook" } });
    }
    try {
        return { parts, stream: await openBookStream(files as string[]) };
    } catch (error) {
        if (error instanceof NotJoinableError) {
            throw new AppErrorV2({ code: ErrorCodes.INVALID_FILE_TYPE, message: "The audiobook cannot be played in a browser", originalError: error });
        }
        throw error;
    }
};

export class BookStreamController {
    /** A link for playing a book in a browser, which cannot send the cookie from an audio element, and where the parts start in the stream. */
    @Route("post", "/audiobooks/:albumId/stream-link", { authenticate: true, schema: BookStreamLinkSchema })
    async createStreamLink(req: FastifyRequest<{ Params: BookParams }>): Promise<BookStreamLink> {
        const { albumId } = req.params;
        const { parts, stream } = await bookStreamOf(albumId);
        const { exp, sig } = signer.sign(albumId);
        return {
            streamPath: `/api/audiobooks/stream/${albumId}`,
            query: `exp=${exp}&sig=${sig}`,
            expiresAt: new Date(exp * 1000).toISOString(),
            parts: parts.map((part, index) => ({ partId: part.id, startSec: stream.startsSec[index] })),
            totalSec: stream.totalSec,
        };
    }

    /** All parts of a book as one mp3 with range requests so it can be seeked. Allowed by the signature of the book, not the cookie; the files are found by book id, so no path is ever taken from the request. */
    @Route("get", "/audiobooks/stream/:albumId", { authenticate: false, schema: BookStreamSchema })
    async stream(req: FastifyRequest<{ Params: BookParams; Querystring: BookStreamQuery }>, reply: FastifyReply) {
        const { albumId } = req.params;
        const { exp, sig } = req.query;
        if (!signer.isValid(albumId, exp, sig)) {
            throw new AppErrorV2({ code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });
        }
        const { stream } = await bookStreamOf(albumId);
        reply.header("Content-Type", "audio/mpeg");
        reply.header("Accept-Ranges", "bytes");
        reply.header("Cache-Control", "private, no-store");
        const range = parseByteRange(req.headers.range, stream.size);
        if (range === "unsatisfiable") {
            return reply.status(416).header("Content-Range", `bytes */${stream.size}`).send();
        }
        const { start, end } = range ?? { start: 0, end: stream.size - 1 };
        const body = readBookStream(stream, start, end);
        body.on("error", () => reply.raw.destroy());
        if (!range) {
            return reply.header("Content-Length", stream.size).send(body);
        }
        return reply.status(206).header("Content-Range", `bytes ${start}-${end}/${stream.size}`).header("Content-Length", end - start + 1).send(body);
    }
}
