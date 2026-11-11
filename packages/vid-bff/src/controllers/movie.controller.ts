import { AppErrorV2, Route } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import {
    HomeVideoStreamQuery,
    MovieItem,
    MovieItemParams,
    MovieItemParamsSchema,
    MovieItemsQuery,
    MovieItemsSchema,
    MovieItemUpdate,
    MovieItemUpdateSchema,
    MovieStreamLink,
    MovieStreamSchema,
    MovieSubtitleParams,
    MovieSubtitleSchema,
} from "@vid/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { movieService } from "../movie/movie.service";
import { sendVideoFile } from "../stream/send-video-file";
import { isValidStreamQuery, signStreamQuery } from "../stream/signed-url";

const notFound = (what: string) => new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: `There is no such ${what}`, params: { resource: what } });

export class MovieController {
    @Route("get", "/movies/items", { authenticate: true, schema: MovieItemsSchema })
    async getItems(req: FastifyRequest<{ Querystring: MovieItemsQuery }>): Promise<MovieItem[]> {
        return movieService.list(req.query.category);
    }

    @Route("get", "/movies/items/:id", { authenticate: true, schema: MovieItemParamsSchema })
    async getItem(req: FastifyRequest<{ Params: MovieItemParams }>): Promise<MovieItem> {
        const item = movieService.get(req.params.id);
        if (!item) {
            throw notFound("item");
        }
        return item;
    }

    @Route("patch", "/movies/items/:id", { authenticate: true, schema: MovieItemUpdateSchema })
    async updateItem(req: FastifyRequest<{ Params: MovieItemParams; Body: MovieItemUpdate }>): Promise<MovieItem> {
        return movieService.update(req.params.id, req.body);
    }

    /** A subtitle file as WebVTT. Found by item id and number, so no path is ever taken from the request. */
    @Route("get", "/movies/items/:id/subtitles/:index", { authenticate: true, schema: MovieSubtitleSchema })
    async getSubtitle(req: FastifyRequest<{ Params: MovieSubtitleParams }>, reply: FastifyReply) {
        const file = movieService.subtitlePath(req.params.id, req.params.index);
        if (!file) {
            throw notFound("subtitle");
        }
        reply.header("Content-Type", "text/vtt; charset=utf-8");
        return reply.send(createReadStream(file));
    }

    /** A link to the stream that works without the cookie, for the browser player and for a Chromecast. */
    @Route("post", "/movies/items/:id/stream-link", { authenticate: true, schema: MovieItemParamsSchema })
    async createStreamLink(req: FastifyRequest<{ Params: MovieItemParams }>): Promise<MovieStreamLink> {
        const { id } = req.params;
        if (!movieService.get(id)) {
            throw notFound("item");
        }
        const { exp, sig } = signStreamQuery(id);
        return { path: `/api/movies/stream/${id}?exp=${exp}&sig=${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
    }

    /** The video itself, with range requests so it can be seeked. Allowed by the signature, not the cookie. */
    @Route("get", "/movies/stream/:id", { authenticate: false, schema: MovieStreamSchema })
    async stream(req: FastifyRequest<{ Params: MovieItemParams; Querystring: HomeVideoStreamQuery }>, reply: FastifyReply) {
        const { id } = req.params;
        const { exp, sig } = req.query;
        if (!isValidStreamQuery(id, exp, sig)) {
            throw new AppErrorV2({ statusCode: 403, code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });
        }
        return sendVideoFile(req, reply, movieService.filePath(id));
    }
}
