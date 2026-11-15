import axios from "axios";
import { createWriteStream } from "fs";
import { mkdir, rename, rm } from "fs/promises";
import path from "path";
import { pipeline } from "stream/promises";
import { movieConfig } from "./movie.config";

export type TmdbKind = "movie" | "tv";

/** What TMDB knows of a film or a series. */
export type TmdbEntry = {
    id: number;
    title: string;
    originalTitle: string;
    year: number | null;
    overview: string | null;
    rating: number | null;
    posterPath: string | null;
};

type TmdbResponseEntry = {
    id: number;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
    vote_average?: number;
    poster_path?: string | null;
};

const IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

const http = axios.create({
    baseURL: "https://api.themoviedb.org/3",
    timeout: 15000,
    headers: { Authorization: `Bearer ${movieConfig.tmdbToken}` },
});

const toEntry = (entry: TmdbResponseEntry): TmdbEntry => {
    const title = entry.title ?? entry.name ?? "";
    const date = entry.release_date ?? entry.first_air_date;
    return {
        id: entry.id,
        title,
        originalTitle: entry.original_title ?? entry.original_name ?? title,
        year: date ? Number(date.slice(0, 4)) || null : null,
        overview: entry.overview || null,
        // TMDB gives 0 for an entry nobody has rated.
        rating: entry.vote_average ? Math.round(entry.vote_average * 10) / 10 : null,
        posterPath: entry.poster_path ?? null,
    };
};

/** The posters have a file each, named by kind and TMDB id, because a film and a series can have the same id. */
export const posterFileName = (kind: TmdbKind, id: number) => `${kind}-${id}.jpg`;

/** The TMDB API. Every call throws when TMDB cannot be reached or refuses the token. */
export const tmdbClient = {
    available: (): boolean => movieConfig.tmdbToken !== undefined,

    async search(kind: TmdbKind, query: string): Promise<TmdbEntry[]> {
        const { data } = await http.get<{ results: TmdbResponseEntry[] }>(`/search/${kind}`, { params: { query, language: "en-US", include_adult: false } });
        return data.results.map(toEntry);
    },

    async get(kind: TmdbKind, id: number): Promise<TmdbEntry> {
        const { data } = await http.get<TmdbResponseEntry>(`/${kind}/${id}`, { params: { language: "en-US" } });
        return toEntry(data);
    },

    /** Saves the poster in the posters folder, written to a temporary file first so a half poster is never left. */
    async downloadPoster(kind: TmdbKind, entry: TmdbEntry): Promise<string | undefined> {
        if (!entry.posterPath) {
            return undefined;
        }
        const name = posterFileName(kind, entry.id);
        const target = path.join(movieConfig.postersDir, name);
        const temporary = `${target}.tmp`;
        await mkdir(movieConfig.postersDir, { recursive: true });
        try {
            const { data } = await axios.get(`${IMAGE_BASE}${entry.posterPath}`, { responseType: "stream", timeout: 15000 });
            await pipeline(data, createWriteStream(temporary));
            await rename(temporary, target);
        } catch (error) {
            await rm(temporary, { force: true });
            throw error;
        }
        return name;
    },
};
