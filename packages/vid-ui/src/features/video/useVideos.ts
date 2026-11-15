import { isMovieId, MovieSubtitle } from "@vid/common";
import { useCallback } from "react";
import { thumbnailUrl } from "../../api/home-video-api";
import { clipPath } from "../home-video/ClipTile";
import { clipName } from "../home-video/clipFormat";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { useGetMovieItemsQuery } from "../movie/movie.api";
import { movieName } from "../movie/movieFormat";
import { MOVIE_SECTION_PATHS, moviePath, seriesPath } from "../movie/movieSections";
import { posterUrl } from "../movie/movieUrls";

/** What the queues, the cast bar and the player need to show of a video, whether it is a clip of the home videos or an item of the movies. */
export type VideoInfo = {
    name: string;
    /** A poster frame for a clip, the poster for a film. Undefined for a film without one. */
    imageUrl?: string;
    /** A poster is a portrait picture, which a wide box shows whole instead of cropped. */
    portrait: boolean;
    durationSeconds: number;
    /** The page of the video: the series page for an episode. */
    path?: string;
    subtitles: MovieSubtitle[];
};

/** Finds a video by its id among the clips and the movie items. It is undefined until the library has loaded, or when the video is gone. */
export const useVideos = (): ((id: string | undefined) => VideoInfo | undefined) => {
    const { data: clips } = useGetClipsQuery();
    const { data: movies } = useGetMovieItemsQuery(undefined);
    return useCallback(
        (id) => {
            if (!id) return undefined;
            if (!isMovieId(id)) {
                const clip = clips?.find((c) => c.id === id);
                return (
                    clip && {
                        name: clipName(clip),
                        imageUrl: thumbnailUrl(id),
                        portrait: false,
                        durationSeconds: clip.durationSeconds,
                        path: clipPath(id),
                        subtitles: [],
                    }
                );
            }
            const item = movies?.find((m) => m.id === id);
            if (!item) return undefined;
            return {
                name: movieName(item),
                imageUrl: item.hasPoster ? posterUrl(id) : undefined,
                portrait: true,
                durationSeconds: item.durationSeconds,
                path: item.series
                    ? seriesPath(item.series)
                    : item.category in MOVIE_SECTION_PATHS
                      ? moviePath(item.category as keyof typeof MOVIE_SECTION_PATHS, id)
                      : undefined,
                subtitles: item.subtitles,
            };
        },
        [clips, movies]
    );
};
