import MovieIcon from "@mui/icons-material/Movie";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Box, Button, CircularProgress, IconButton, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import React, { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { rejectionText } from "../../api/errorText";
import { CastPicker } from "../cast/CastPicker";
import { PlayAllButton } from "../cast/PlayAllButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { FilmPlayer } from "./FilmPlayer";
import { MatchPicker } from "./MatchPicker";
import { useGetMovieItemsQuery, useSetMovieMatchMutation } from "./movie.api";
import { formatRating, formatRuntime } from "./movieFormat";
import { posterUrl } from "./movieUrls";
import { groupSeries } from "./series";
import { TmdbAttribution } from "./TmdbAttribution";

const POSTER_WIDTH = 280;

/** A series: its poster and what TMDB says about it, and its episodes by season, each to play here or on a Chromecast. */
export const SeriesPage: React.FC = () => {
    const { name = "" } = useParams();
    const { data: items } = useGetMovieItemsQuery("tv");
    const [setMatch, { isLoading: refreshing, error }] = useSetMovieMatchMutation();
    const [picking, setPicking] = useState(false);
    // The episode in the player of the page.
    const [watchingId, setWatchingId] = useState<string>();
    const video = useRef<HTMLVideoElement>(null);
    const series = useMemo(() => groupSeries(items ?? []).find((s) => s.name === name), [items, name]);

    if (!items) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
    if (!series) return <Alert severity="warning">There is no such series.</Alert>;
    // The episodes share the entry of the series, so the first one stands for it.
    const first = series.episodes[0];
    const { tmdbId } = first;
    const rating = formatRating(first.rating);
    const watching = series.episodes.find((e) => e.id === watchingId);

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {watching && <FilmPlayer key={watching.id} ref={video} item={watching} />}
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
                    {first.hasPoster ? (
                        <Box
                            component="img"
                            src={posterUrl(first.id)}
                            alt=""
                            sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    ) : (
                        <MovieIcon color="disabled" sx={{ fontSize: 64 }} />
                    )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="h5">{series.name}</Typography>
                    <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {[
                            `${series.seasons.length} ${series.seasons.length === 1 ? "season" : "seasons"}`,
                            `${series.episodes.length} ${series.episodes.length === 1 ? "episode" : "episodes"}`,
                            rating && `★ ${rating}`,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </Typography>
                    {first.overview && <Typography sx={{ mb: 2 }}>{first.overview}</Typography>}
                    {!tmdbId && (
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            No TMDB entry is picked for this series.
                        </Typography>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {rejectionText({ error })}
                        </Alert>
                    )}
                    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                        <PlayAllButton clipIds={series.episodes.map((e) => e.id)} label="Play all" />
                        {tmdbId !== null && (
                            <Button
                                variant="outlined"
                                startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                                disabled={refreshing}
                                onClick={() => void setMatch({ id: first.id, tmdbId })}
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
            {series.seasons.map(({ season, episodes }) => (
                <Box key={season} sx={{ mt: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">{season === 0 ? "Specials" : `Season ${season}`}</Typography>
                        <PlayAllButton clipIds={episodes.map((e) => e.id)} label="Play season" />
                    </Stack>
                    <List disablePadding>
                        {episodes.map((e) => (
                            <ListItem
                                key={e.id}
                                disableGutters
                                divider
                                secondaryAction={
                                    <CastPicker
                                        clipId={e.id}
                                        getPosition={() => (e.id === watchingId ? (video.current?.currentTime ?? 0) : 0)}
                                        onCasting={() => {
                                            if (e.id === watchingId) video.current?.pause();
                                        }}
                                        onHandBack={(positionSec) => {
                                            setWatchingId(e.id);
                                            // The player of the episode is made after this, so it starts at the position when it is ready.
                                            window.setTimeout(() => {
                                                if (!video.current) return;
                                                video.current.currentTime = positionSec;
                                                void video.current.play().catch(() => undefined);
                                            }, 500);
                                        }}
                                    />
                                }
                            >
                                <IconButton aria-label={`Play ${e.title}`} onClick={() => setWatchingId(e.id)} sx={{ mr: 1 }}>
                                    <PlayArrowIcon color={e.id === watchingId ? "primary" : undefined} />
                                </IconButton>
                                <ListItemText
                                    primary={`${e.episode ?? ""}${e.episode === null ? "" : ". "}${e.title}`}
                                    secondary={formatRuntime(e.durationSeconds)}
                                />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            ))}
            <TmdbAttribution />
            {picking && <MatchPicker item={{ ...first, title: series.name }} onClose={() => setPicking(false)} />}
        </Box>
    );
};
