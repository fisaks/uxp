/**
 * Ids of the videos that can be cast and queued. A home video clip has 16 hex characters. An item of the movies (films and episodes) has the same
 * with an `m` in front, so the kind is known from the id and nothing has to be searched for it.
 */
export const MOVIE_ID_PREFIX = "m";

export const VIDEO_ID_PATTERN = `^${MOVIE_ID_PREFIX}?[0-9a-f]{16}$`;
export const MOVIE_ID_PATTERN = `^${MOVIE_ID_PREFIX}[0-9a-f]{16}$`;

export const isMovieId = (id: string): boolean => id.startsWith(MOVIE_ID_PREFIX);
