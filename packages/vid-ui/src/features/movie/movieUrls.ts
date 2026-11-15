import { apiUrl } from "../../api/home-video-api";

const moviesUrl = (path: string) => apiUrl(`movies/${path}`);

/** When the poster of an item was refetched in this session. The browser keeps posters for a day, so the address changes then. */
const refetched = new Map<string, number>();

export const posterBumped = (id: string) => refetched.set(id, Date.now());

export const posterUrl = (id: string) => {
    const base = moviesUrl(`items/${id}/poster`);
    const version = refetched.get(id);
    return version ? `${base}?v=${version}` : base;
};

/** A picture of TMDB, for a candidate the user can pick. Nothing of it is kept here. */
export const tmdbPosterUrl = (posterPath: string) => `https://image.tmdb.org/t/p/w92${posterPath}`;

/** A subtitle as WebVTT. The route takes the cookie, which the browser sends to the same address as the rest of the API. */
export const subtitleUrl = (id: string, index: number) => moviesUrl(`items/${id}/subtitles/${index}`);
