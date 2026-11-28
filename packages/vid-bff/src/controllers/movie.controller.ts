import { AppErrorV2, AppLogger, Route } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import {
    HomeVideoStreamQuery,
    MovieAudioUpdate,
    MovieAudioUpdateSchema,
    MovieItem,
    MovieItemParams,
    MovieItemParamsSchema,
    MovieItemsQuery,
    MovieItemsSchema,
    MovieItemUpdate,
    MovieItemUpdateSchema,
    MovieMatchCandidate,
    MovieMatchQuery,
    MovieMatchSearchSchema,
    MovieMatchUpdate,
    MovieMatchUpdateSchema,
    MovieSearchQuery,
    MovieSearchResult,
    MovieSearchSchema,
    MovieSignedSubtitleSchema,
    MovieStreamLink,
    MovieStreamQuery,
    MovieStreamSchema,
    MovieSubtitleParams,
    MovieSubtitleSchema,
    MovieSubtitleUpdate,
    MovieSubtitleUpdateSchema,
    MovieVideoStreamSchema,
} from "@vid/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { castService } from "../cast/cast.service";
import { audioTrackFile } from "../movie/audio-remux";
import { movieService } from "../movie/movie.service";
import { sendVideoFile } from "../stream/send-video-file";
import { isValidStreamQuery, signStreamQuery } from "../stream/signed-url";

const ONE_DAY_SECONDS = 24 * 60 * 60;

const notFound = (what: string) => new AppErrorV2({code: ErrorCodes.NOT_FOUND, message: `There is no such ${what}`, params: { resource: what } });

const searchUnavailable = () => new AppErrorV2({ code: ErrorCodes.SERVICE_NOT_CONFIGURED, message: "Search is not available" });

export class MovieController {
    @Route("get", "/movies/items", { authenticate: true, schema: MovieItemsSchema })
    async getItems(req: FastifyRequest<{ Querystring: MovieItemsQuery }>): Promise<MovieItem[]> {
        return movieService.list(req.query.category);
    }

    /** The ids of the items that match the words, best first. */
    @Route("get", "/movies/search", { authenticate: true, schema: MovieSearchSchema })
    async search(req: FastifyRequest<{ Querystring: MovieSearchQuery }>): Promise<MovieSearchResult> {
        if (!movieService.search.available) {
            throw searchUnavailable();
        }
        try {
            return { ids: await movieService.search.find(req.query.q) };
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] The movie search failed", error });
            throw searchUnavailable();
        }
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

    /** Sets the audio track of a film. A Chromecast that plays the film loads it again with the new track, from where it is. */
    @Route("put", "/movies/items/:id/audio", { authenticate: true, schema: MovieAudioUpdateSchema })
    async updateAudio(req: FastifyRequest<{ Params: MovieItemParams; Body: MovieAudioUpdate }>): Promise<MovieItem> {
        const item = await movieService.setAudio(req.params.id, req.body.audio);
        castService.reloadClip(req.params.id);
        return item;
    }

    /** Sets the subtitle that shows when the film is played, null for none. A player that is playing the film keeps what it shows. */
    @Route("put", "/movies/items/:id/subtitle", { authenticate: true, schema: MovieSubtitleUpdateSchema })
    async updateSubtitle(req: FastifyRequest<{ Params: MovieItemParams; Body: MovieSubtitleUpdate }>): Promise<MovieItem> {
        return movieService.setSubtitle(req.params.id, req.body.subtitle);
    }

    /** The TMDB entries for a text, for picking the right one for an item. */
    @Route("get", "/movies/items/:id/tmdb-search", { authenticate: true, schema: MovieMatchSearchSchema })
    async searchMatch(req: FastifyRequest<{ Params: MovieItemParams; Querystring: MovieMatchQuery }>): Promise<MovieMatchCandidate[]> {
        return movieService.searchEntries(req.params.id, req.query.q);
    }

    /** Sets the TMDB entry of an item (of its series for an episode). A null id says there is none. */
    @Route("put", "/movies/items/:id/match", { authenticate: true, schema: MovieMatchUpdateSchema })
    async updateMatch(req: FastifyRequest<{ Params: MovieItemParams; Body: MovieMatchUpdate }>): Promise<MovieItem> {
        return movieService.setMatch(req.params.id, req.body.tmdbId, req.body.kind);
    }

    /** The poster of an item. Found by item id, so no path is ever taken from the request. */
    @Route("get", "/movies/items/:id/poster", { authenticate: true, schema: MovieItemParamsSchema })
    async getPoster(req: FastifyRequest<{ Params: MovieItemParams }>, reply: FastifyReply) {
        return this.sendPoster(reply, movieService.posterPath(req.params.id));
    }

    /** The poster for a Chromecast, which has no cookie. Allowed by the same signature as the stream. */
    @Route("get", "/movies/poster/:id", { authenticate: false, schema: MovieStreamSchema })
    async getSignedPoster(req: FastifyRequest<{ Params: MovieItemParams; Querystring: HomeVideoStreamQuery }>, reply: FastifyReply) {
        const { id } = req.params;
        const { exp, sig } = req.query;
        if (!isValidStreamQuery(id, exp, sig)) {
            throw new AppErrorV2({code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });
        }
        return this.sendPoster(reply, movieService.posterPath(id));
    }

    private sendPoster(reply: FastifyReply, file: string | undefined) {
        if (!file) {
            throw notFound("poster");
        }
        reply.header("Content-Type", "image/jpeg");
        reply.header("Cache-Control", `private, max-age=${ONE_DAY_SECONDS}`);
        return reply.send(createReadStream(file));
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

    /** A subtitle file for a Chromecast, which has no cookie. Allowed by the same signature as the stream. The receiver fetches it from another origin, so it may be read from any. */
    @Route("get", "/movies/subtitle/:id/:index", { authenticate: false, schema: MovieSignedSubtitleSchema })
    async getSignedSubtitle(req: FastifyRequest<{ Params: MovieSubtitleParams; Querystring: HomeVideoStreamQuery }>, reply: FastifyReply) {
        const { id, index } = req.params;
        const { exp, sig } = req.query;
        if (!isValidStreamQuery(id, exp, sig)) {
            throw new AppErrorV2({code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });
        }
        const file = movieService.subtitlePath(id, index);
        if (!file) {
            throw notFound("subtitle");
        }
        reply.header("Content-Type", "text/vtt; charset=utf-8");
        reply.header("Access-Control-Allow-Origin", "*");
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

    /**
     * The video itself, with range requests so it can be seeked. Allowed by the signature, not the cookie.
     * `audio` picks an audio track other than the first: the video is then streamed from a copy that has only that track.
     */
    @Route("get", "/movies/stream/:id", { authenticate: false, schema: MovieVideoStreamSchema })
    async stream(req: FastifyRequest<{ Params: MovieItemParams; Querystring: MovieStreamQuery }>, reply: FastifyReply) {
        const { id } = req.params;
        const { exp, sig, audio } = req.query;
        if (!isValidStreamQuery(id, exp, sig)) {
            throw new AppErrorV2({code: ErrorCodes.FORBIDDEN, message: "The link is not valid or has expired" });
        }
        const file = movieService.filePath(id);
        const info = movieService.audioInfo(id);
        if (!audio || !file || !info) {
            return sendVideoFile(req, reply, file);
        }
        if (audio >= info.trackCount) {
            throw notFound("audio track");
        }
        return sendVideoFile(req, reply, await audioTrackFile(file, id, audio, info.sizeBytes));
    }
}
