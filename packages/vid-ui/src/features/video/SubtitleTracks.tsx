import { MovieSubtitle } from "@vid/common";
import React from "react";
import { subtitleUrl } from "../movie/movieUrls";

/** The subtitles of a film for a video element, which offers them in its own menu. Nothing shows until one is picked there. */
export const SubtitleTracks: React.FC<{ id: string | undefined; subtitles: MovieSubtitle[] }> = ({ id, subtitles }) => (
    <>
        {id &&
            subtitles.map(({ index, label, language }) => (
                <track key={index} kind="subtitles" src={subtitleUrl(id, index)} label={label} srcLang={language ?? undefined} />
            ))}
    </>
);
