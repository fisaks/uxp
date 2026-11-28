import { Alert, Box, Stack } from "@mui/material";
import { BROWSER_PLAYBACK_RATES, MovieItem } from "@vid/common";
import React, { forwardRef, useState } from "react";
import { RateButton } from "../cast/RateButton";
import { SubtitleButton } from "../cast/SubtitleButton";
import { SubtitleTracks } from "../video/SubtitleTracks";
import { useStreamUrl } from "../video/useStreamUrl";
import { useSubtitleTracks } from "../video/useSubtitleTracks";
import { AudioButton } from "./AudioButton";
import { posterUrl } from "./movieUrls";
import { useSetMovieAudioMutation } from "./movie.api";

/** Where to go on and whether to play when the video is loaded again after another audio track was picked. */
type Resume = { time: number; playing: boolean };

/** The film or episode in a 16:9 player of the page, with the speed button and, when the film has them, the subtitle button and the audio button. It makes the link to the stream when it opens, and starts playing. */
export const FilmPlayer = forwardRef<HTMLVideoElement, { item: MovieItem }>(({ item }, video) => {
    const [rate, setRate] = useState(1);
    const { url: streamLink, failed } = useStreamUrl(item.id);
    const { audio } = item;
    const [setMovieAudio] = useSetMovieAudioMutation();
    const [resume, setResume] = useState<Resume>();
    // The browser plays the first audio track of a file and cannot switch, so the BFF streams a copy with the picked track.
    const url = streamLink && (audio ? `${streamLink}&audio=${audio}` : streamLink);
    const videoRef = video as React.RefObject<HTMLVideoElement>;
    // The film starts with the subtitle it keeps, and a pick here, in the buttons or the menu of the video, is kept for the next time.
    const subtitles = useSubtitleTracks(videoRef, item.id, item.subtitle, url);

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
                            autoPlay={resume?.playing ?? true}
                            playsInline
                            onLoadedMetadata={(event) => {
                                event.currentTarget.playbackRate = rate;
                                subtitles.sync();
                                if (resume) {
                                    event.currentTarget.currentTime = resume.time;
                                    setResume(undefined);
                                }
                            }}
                            style={{ display: "block", width: "100%", height: "100%" }}
                        >
                            <SubtitleTracks id={item.id} subtitles={item.subtitles} active={item.subtitle} />
                        </video>
                    )
                )}
            </Box>
            <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 0.5 }}>
                {item.subtitles.length > 0 && (
                    <SubtitleButton subtitles={item.subtitles} selected={subtitles.subtitle} onChange={subtitles.show} />
                )}
                {item.audioTracks.length > 1 && (
                    <AudioButton
                        compact
                        tracks={item.audioTracks}
                        selected={audio}
                        onChange={(index) => {
                            if (index === audio) return;
                            const element = videoRef.current;
                            setResume(element ? { time: element.currentTime, playing: !element.paused } : undefined);
                            // The choice is kept by the BFF, which makes the copy of the film with the track. The film reloads when it is made.
                            setMovieAudio({ id: item.id, audio: index })
                                .unwrap()
                                .catch(() => setResume(undefined));
                        }}
                    />
                )}
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
