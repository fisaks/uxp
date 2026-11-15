import { Alert, Box, Stack } from "@mui/material";
import { BROWSER_PLAYBACK_RATES, MovieItem } from "@vid/common";
import React, { forwardRef, useState } from "react";
import { RateButton } from "../cast/RateButton";
import { SubtitleTracks } from "../video/SubtitleTracks";
import { useStreamUrl } from "../video/useStreamUrl";
import { posterUrl } from "./movieUrls";

/** The film or episode in a 16:9 player of the page, with the speed button. It makes the link to the stream when it opens, and starts playing. */
export const FilmPlayer = forwardRef<HTMLVideoElement, { item: MovieItem }>(({ item }, video) => {
    const [rate, setRate] = useState(1);
    const { url, failed } = useStreamUrl(item.id);
    const videoRef = video as React.RefObject<HTMLVideoElement>;

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ bgcolor: "common.black", borderRadius: 1, overflow: "hidden", aspectRatio: "16 / 9" }}>
                {failed ? (
                    <Alert severity="error">The video could not be opened.</Alert>
                ) : (
                    url && (
                        <video
                            key={item.id}
                            ref={video}
                            src={url}
                            poster={item.hasPoster ? posterUrl(item.id) : undefined}
                            controls
                            autoPlay
                            playsInline
                            onLoadedMetadata={(event) => {
                                event.currentTarget.playbackRate = rate;
                            }}
                            style={{ display: "block", width: "100%", height: "100%" }}
                        >
                            <SubtitleTracks id={item.id} subtitles={item.subtitles} />
                        </video>
                    )
                )}
            </Box>
            <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 0.5 }}>
                <RateButton
                    rates={BROWSER_PLAYBACK_RATES}
                    rate={rate}
                    onChange={(value) => {
                        setRate(value);
                        if (videoRef.current) videoRef.current.playbackRate = value;
                    }}
                />
            </Stack>
        </Box>
    );
});
FilmPlayer.displayName = "FilmPlayer";
