import { BookParams, BookStreamLink, BookStreamLinkSchema, BookStreamParams, BookStreamQuery, BookStreamSchema } from "@aud/common";
import { AppErrorV2, Route, createStreamSigner, sendRangedFile } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { audiobookService } from "../library/library.service";

const signer = createStreamSigner("aud-stream");

export class BookStreamController {
    /** A link for playing the parts of a book in a browser, which cannot send the cookie from an audio element. */
    @Route("post", "/audiobooks/:albumId/stream-link", { authenticate: true, schema: BookStreamLinkSchema })
    async createStreamLink(req: FastifyRequest<{ Params: BookParams }>): Promise<BookStreamLink> {
        const { albumId } = req.params;
        if (!audiobookService.getAlbum(albumId)) {
            throw new AppErrorV2({ code: ErrorCodes.NOT_FOUND, message: "There is no such audiobook", params: { resource: "audiobook" } });
        }
        const { exp, sig } = signer.sign(albumId);
        return { streamPath: `/api/audiobooks/stream/${albumId}`, query: `exp=${exp}&sig=${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
    }

    /** A part of a book, with range requests so it can be seeked. Allowed by the signature of the book, not the cookie; the file is found by book and part id, so no path is ever taken from the request. */
    @Route("get", "/audiobooks/stream/:albumId/:partId", { authenticate: false, schema: BookStreamSchema })
    async stream(req: FastifyRequest<{ Params: BookStreamParams; Querystring: BookStreamQuery }>, reply: FastifyReply) {
        const { albumId, partId } = req.params;
        const { exp, sig } = req.query;
        if (!signer.isValid(albumId, exp, sig)) {
            throw new AppErrorV2({ code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });
        }
        const inBook = audiobookService.getTrack(partId)?.albumId === albumId;
        return sendRangedFile(req, reply, inBook ? audiobookService.getTrackFile(partId) : undefined, "audio/mpeg", "audiobook part");
    }
}
