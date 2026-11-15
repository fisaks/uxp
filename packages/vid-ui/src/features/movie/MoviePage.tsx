import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import MovieIcon from "@mui/icons-material/Movie";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { BROWSER_PLAYBACK_RATES } from "@vid/common";
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { rejectionText } from "../../api/errorText";
import { CastPicker } from "../cast/CastPicker";
import { RateButton } from "../cast/RateButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { SubtitleTracks } from "../video/SubtitleTracks";
import { useStreamUrl } from "../video/useStreamUrl";
import { MatchPicker } from "./MatchPicker";
import { useGetMovieItemsQuery, useSetMovieMatchMutation } from "./movie.api";
import { formatRating, formatRuntime } from "./movieFormat";
import { MovieSectionCategory } from "./movieSections";
import { posterUrl } from "./movieUrls";
import { TmdbAttribution } from "./TmdbAttribution";

const POSTER_WIDTH = 280;

/** A film: its poster, what TMDB says about it, and the ways to fetch that again or pick another entry. */
export const MoviePage: React.FC<{ category: MovieSectionCategory }> = ({ category }) => {
    const { id = "" } = useParams();
    const { data: items } = useGetMovieItemsQuery(category);
    const [setMatch, { isLoading: refreshing, error }] = useSetMovieMatchMutation();
    const [picking, setPicking] = useState(false);
    // The player opens when Play is pressed, and the link to the stream is made then.
    const [watching, setWatching] = useState(false);
    const [rate, setRate] = useState(1);
    const video = useRef<HTMLVideoElement>(null);
    const { url, failed } = useStreamUrl(id, watching);
    useEffect(() => {
        setWatching(false);
        setRate(1);
    }, [id]);
    const item = items?.find((i) => i.id === id);

    if (!items) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
    if (!item) return <Alert severity="warning">There is no such film.</Alert>;
    const rating = formatRating(item.rating);
    const { tmdbId } = item;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {watching && (
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ bgcolor: "common.black", borderRadius: 1, overflow: "hidden", aspectRatio: "16 / 9" }}>
                        {failed ? (
                            <Alert severity="error">The film could not be opened.</Alert>
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
                                if (video.current) video.current.playbackRate = value;
                            }}
                        />
                    </Stack>
                </Box>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} gap={3} alignItems={{ xs: "center", sm: "flex-start" }}>
                <Box
                    sx={{
                        width: { xs: "60%", sm: POSTER_WIDTH },
                        flexShrink: 0,
                        aspectRatio: "2 / 3",
                        bgcolor: "action.hover",
                        borderRadius: 1,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {item.hasPoster ? (
                        <Box
                            component="img"
                            src={posterUrl(item.id)}
                            alt=""
                            sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    ) : (
                        <MovieIcon color="disabled" sx={{ fontSize: 64 }} />
                    )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h5">{item.title}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {[item.year, formatRuntime(item.durationSeconds), rating && `★ ${rating}`].filter(Boolean).join(" · ")}
                    </Typography>
                    {item.overview && <Typography sx={{ mb: 2 }}>{item.overview}</Typography>}
                    {!tmdbId && (
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            No TMDB entry is picked for this film.
                        </Typography>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {rejectionText({ error })}
                        </Alert>
                    )}
                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        {!watching && (
                            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => setWatching(true)}>
                                Play
                            </Button>
                        )}
                        <CastPicker
                            clipId={item.id}
                            getPosition={() => video.current?.currentTime ?? 0}
                            onCasting={() => video.current?.pause()}
                            onHandBack={(positionSec) => {
                                if (!video.current) return;
                                video.current.currentTime = positionSec;
                                void video.current.play().catch(() => undefined);
                            }}
                        />
                        {tmdbId !== null && (
                            <Button
                                variant="outlined"
                                startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                                disabled={refreshing}
                                onClick={() => void setMatch({ id: item.id, tmdbId })}
                            >
                                Refresh from TMDB
                            </Button>
                        )}
                        <Button variant="outlined" onClick={() => setPicking(true)}>
                            {tmdbId === null ? "Pick TMDB entry" : "Change TMDB entry"}
                        </Button>
                    </Stack>
                </Box>
            </Stack>
            <TmdbAttribution />
            {picking && <MatchPicker item={item} onClose={() => setPicking(false)} />}
        </Box>
    );
};
