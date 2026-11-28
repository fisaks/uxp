import { RefObject, useEffect, useRef, useState } from "react";
import { useSetMovieSubtitleMutation } from "../movie/movie.api";

/**
 * The subtitles of the video of a player: which one shows, a way to show another, and keeping the choice with the film. The video
 * is the one that knows what shows, since its own menu changes it too: a change there is saved like one made with `show`.
 * The tracks are the `<track>` elements of the video, in the order of the subtitles of the film. `src` is what makes a new video.
 * `onChange` is told when what shows has changed.
 */
export const useSubtitleTracks = (
    video: RefObject<HTMLVideoElement | null>,
    filmId: string | undefined,
    kept: number | null | undefined,
    src: string | undefined,
    onChange?: () => void
) => {
    const [setMovieSubtitle] = useSetMovieSubtitleMutation();
    const [subtitle, setSubtitle] = useState<number | null>(null);
    // What the film keeps, so that a change is saved once and not each time the video says that its tracks changed.
    const keptRef = useRef<number | null>(null);
    keptRef.current = kept ?? null;
    const latest = useRef({ filmId, onChange });
    latest.current = { filmId, onChange };

    /** The index of the subtitle that shows in the video, null for none. */
    const shown = (): number | null => {
        const tracks = video.current?.textTracks;
        for (let i = 0; tracks && i < tracks.length; i++) {
            if (tracks[i].mode === "showing") return i;
        }
        return null;
    };

    /** Shows the subtitle with the index, none with null. */
    const show = (index: number | null) => {
        const tracks = video.current?.textTracks;
        for (let i = 0; tracks && i < tracks.length; i++) {
            tracks[i].mode = i === index ? "showing" : "disabled";
        }
    };

    useEffect(() => {
        const tracks = video.current?.textTracks;
        if (!tracks) return;
        const changed = () => {
            const now = shown();
            setSubtitle(now);
            latest.current.onChange?.();
            const id = latest.current.filmId;
            if (id && now !== keptRef.current) {
                keptRef.current = now;
                void setMovieSubtitle({ id, subtitle: now });
            }
        };
        tracks.addEventListener("change", changed);
        return () => tracks.removeEventListener("change", changed);
    }, [src]);

    return {
        subtitle,
        shown,
        show,
        /** For when the video has loaded, and the track that is shown by default does not say so. */ sync: () => setSubtitle(shown()),
    };
};
