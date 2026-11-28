import { MovieSubtitle } from "@vid/common";
import React from "react";
import { subtitleUrl } from "../movie/movieUrls";

/** The subtitles of a film for a video element, which offers them in its own menu. Nothing shows until one is picked there, except the `active` one. */
export const SubtitleTracks: React.FC<{ id: string | undefined; subtitles: MovieSubtitle[]; active?: number | null }> = ({
    id,
    subtitles,
    active,
}) => (
    <>
        {id &&
            subtitles.map(({ index, label, language }) => (
                <track
                    key={index}
                    kind="subtitles"
                    src={subtitleUrl(id, index)}
                    label={label}
                    srcLang={language ?? undefined}
                    default={index === active}
                />
            ))}
    </>
);
