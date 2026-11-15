import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { MovieItem, MovieTmdbKind } from "@vid/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";
import { rejectionText } from "../../api/errorText";
import { useSearchMovieMatchesQuery, useSetMovieMatchMutation } from "./movie.api";
import { tmdbPosterUrl } from "./movieUrls";

type MatchPickerProps = { item: MovieItem; onClose: () => void };

/** Lists the TMDB entries for the words, starting with the title of the film, and sets the one that is picked. */
export const MatchPicker: React.FC<MatchPickerProps> = ({ item, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const [text, setText] = useState(item.title);
    const [q, setQ] = useState(item.title);
    const { data: candidates, isFetching, isError } = useSearchMovieMatchesQuery({ id: item.id, q }, { skip: !q.trim() });
    const [setMatch, { isLoading: saving, error }] = useSetMovieMatchMutation();

    const pick = async (tmdbId: number | null, kind?: MovieTmdbKind) => {
        if (
            !(await setMatch({ id: item.id, tmdbId, kind })
                .unwrap()
                .then(
                    () => true,
                    () => false
                ))
        )
            return;
        onClose();
    };

    return (
        <Dialog open container={portalContainer.current} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Pick the TMDB entry</DialogTitle>
            <DialogContent>
                <Stack
                    component="form"
                    direction="row"
                    gap={1}
                    sx={{ mt: 1, mb: 1 }}
                    onSubmit={(e) => {
                        e.preventDefault();
                        setQ(text.trim());
                    }}
                >
                    <TextField
                        size="small"
                        fullWidth
                        autoFocus
                        label="Search TMDB"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <Button type="submit" variant="outlined">
                        Search
                    </Button>
                </Stack>
                {error && <Alert severity="error">{rejectionText({ error })}</Alert>}
                {isError && <Alert severity="error">TMDB could not be searched.</Alert>}
                {isFetching && <CircularProgress size={24} sx={{ display: "block", mx: "auto", my: 2 }} />}
                {candidates && !isFetching && candidates.length === 0 && <Typography color="text.secondary">Nothing found.</Typography>}
                <List disablePadding>
                    {!isFetching &&
                        candidates?.map((candidate) => (
                            <ListItemButton
                                key={`${candidate.kind}-${candidate.tmdbId}`}
                                disabled={saving}
                                selected={candidate.tmdbId === item.tmdbId && candidate.kind === item.tmdbKind}
                                onClick={() => void pick(candidate.tmdbId, candidate.kind)}
                                sx={{ gap: 1.5, alignItems: "flex-start" }}
                            >
                                <Box
                                    sx={{
                                        width: 46,
                                        aspectRatio: "2 / 3",
                                        flexShrink: 0,
                                        bgcolor: "action.hover",
                                        borderRadius: 0.5,
                                        overflow: "hidden",
                                    }}
                                >
                                    {candidate.posterPath && (
                                        <Box
                                            component="img"
                                            src={tmdbPosterUrl(candidate.posterPath)}
                                            alt=""
                                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    )}
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="subtitle2">
                                        {candidate.year ? `${candidate.title} (${candidate.year})` : candidate.title}
                                        {candidate.kind === "tv" && item.kind === "movie" && " · TV"}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                                    >
                                        {candidate.overview}
                                    </Typography>
                                </Box>
                            </ListItemButton>
                        ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button color="inherit" disabled={saving} onClick={() => void pick(null)}>
                    None of these
                </Button>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};
