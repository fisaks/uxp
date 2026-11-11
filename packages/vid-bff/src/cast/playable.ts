import { isMovieId, MovieItem } from "@vid/common";
import { homeVideoService } from "../home-video/home-video.service";
import { movieService } from "../movie/movie.service";

/** What the cast needs to know of a video to play it, whichever kind it is. */
export type Playable = {
    id: string;
    /** What the TV shows. */
    title: string;
    /** The file, for the log. */
    file: string;
    /** The path of the signed stream route, without the id and the query. */
    streamRoute: string;
    /** The path of the signed poster route, without the id and the query. Undefined when the video has no poster. */
    posterRoute?: string;
};

const HOME_VIDEO_STREAM = "/api/home-videos/stream/";
const MOVIE_STREAM = "/api/movies/stream/";

/** The title as the app names a clip: the title, else the date as d.M.yyyy, else the file name. */
const clipTitle = (title: string, date: string | null, file: string): string => {
    if (title) {
        return title;
    }
    if (date) {
        const [year, month, day] = date.split("-").map(Number);
        return `${day}.${month}.${year}`;
    }
    return file;
};

const episodeTitle = (item: MovieItem): string =>
    `${item.series} S${String(item.season).padStart(2, "0")}E${String(item.episode).padStart(2, "0")} ${item.title}`;

/** The video with the id, undefined when there is none. The id tells whether it is a home video or a movie. */
export const findPlayable = (id: string): Playable | undefined => {
    if (isMovieId(id)) {
        const item = movieService.get(id);
        return (
            item && {
                id,
                title: item.kind === "episode" ? episodeTitle(item) : item.title,
                file: item.file,
                streamRoute: MOVIE_STREAM,
            }
        );
    }
    const clip = homeVideoService.get(id);
    return (
        clip && {
            id,
            title: clipTitle(clip.title, clip.date, clip.file),
            file: clip.file,
            streamRoute: HOME_VIDEO_STREAM,
            posterRoute: "/api/home-videos/poster/",
        }
    );
};

/** The video when the address is a stream link of ours. */
export const playableOfStream = (baseUrl: string, contentId: string): Playable | undefined => {
    for (const route of [HOME_VIDEO_STREAM, MOVIE_STREAM]) {
        if (contentId.startsWith(`${baseUrl}${route}`)) {
            return findPlayable(contentId.slice(baseUrl.length + route.length).split("?")[0]);
        }
    }
    return undefined;
};
