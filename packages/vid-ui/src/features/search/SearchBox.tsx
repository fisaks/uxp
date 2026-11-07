import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
    Box,
    Button,
    ClickAwayListener,
    InputAdornment,
    List,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Paper,
    Popper,
    TextField,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { thumbnailUrl } from "../../api/home-video-api";
import { HOME_VIDEOS_PATH } from "../../menu";
import { clipName, formatDate } from "../home-video/clipFormat";
import { clipPath } from "../home-video/ClipTile";
import { useHomeVideos } from "../home-video/HomeVideosProvider";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { useClipSearch } from "./useClipSearch";

export const SEARCH_PARAM = "q";

const DROPDOWN_MAX_HEIGHT = "70vh";
const DROPDOWN_HITS = 8;
const POSTER_WIDTH = 64;

type SearchBoxProps = {
    /** Puts the cursor in the box when it is shown, for a box that was opened by pressing the search icon. */
    autoFocus?: boolean;
    /** Called when the search is done: the list was opened or a hit was chosen. */
    onDone?: () => void;
};

/**
 * The search box of the app: while typing, a dropdown shows the best few clips, and Enter or "Show all results" opens the
 * home videos list with the words in its address, where the clips that match are shown together with the other filters.
 */
export const SearchBox: React.FC<SearchBoxProps> = ({ autoFocus, onDone }) => {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    const portalContainer = usePortalContainerRef();
    const { clips } = useHomeVideos();
    const anchorRef = useRef<HTMLDivElement>(null);
    // On the list the box starts with the words of the page.
    const onList = pathname.replace(/\/$/, "") === HOME_VIDEOS_PATH;
    const [query, setQuery] = useState(() => (onList ? (new URLSearchParams(search).get(SEARCH_PARAM) ?? "") : ""));
    const [open, setOpen] = useState(false);
    const trimmed = query.trim();
    const ids = useClipSearch(trimmed);
    const hits = useMemo(() => {
        const byId = new Map((clips ?? []).map((clip) => [clip.id, clip]));
        return (ids ?? []).flatMap((id) => byId.get(id) ?? []);
    }, [clips, ids]);

    /** Shows all the clips that match on the list, keeping the other filters of the list. */
    const showAll = (words = trimmed) => {
        const params = new URLSearchParams(onList ? search : "");
        if (words) params.set(SEARCH_PARAM, words);
        else params.delete(SEARCH_PARAM);
        setOpen(false);
        navigate({ pathname: HOME_VIDEOS_PATH, search: params.toString() });
        onDone?.();
    };

    const clear = () => {
        setQuery("");
        // An emptied box also empties the filter of the list.
        if (onList && new URLSearchParams(search).has(SEARCH_PARAM)) showAll("");
    };

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box ref={anchorRef} sx={{ minWidth: 0 }}>
                <TextField
                    size="small"
                    fullWidth
                    autoFocus={autoFocus}
                    placeholder="Search"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        // The field can keep focus after the dropdown was closed, so typing has to open it again.
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setOpen(false);
                        if (e.key === "Enter") showAll();
                    }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" color="primary" />
                                </InputAdornment>
                            ),
                            endAdornment: query ? (
                                <InputAdornment position="end">
                                    <LabelledIconButton label="Clear the search" onClick={clear}>
                                        <ClearIcon fontSize="small" />
                                    </LabelledIconButton>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                />
                <Popper
                    open={open && trimmed !== "" && ids !== undefined}
                    anchorEl={anchorRef.current}
                    container={portalContainer.current}
                    placement="bottom-start"
                    sx={{ zIndex: (theme) => theme.zIndex.modal, width: anchorRef.current?.clientWidth }}
                >
                    <Paper elevation={8} sx={{ mt: 0.5, maxHeight: DROPDOWN_MAX_HEIGHT, overflowY: "auto", minWidth: 280 }}>
                        {hits.length === 0 ? (
                            <Typography color="text.secondary" sx={{ p: 1.5 }}>
                                Nothing found.
                            </Typography>
                        ) : (
                            <List dense disablePadding>
                                {hits.slice(0, DROPDOWN_HITS).map((clip) => (
                                    <ListItemButton
                                        key={clip.id}
                                        onClick={() => {
                                            setOpen(false);
                                            navigate(clipPath(clip.id));
                                            onDone?.();
                                        }}
                                    >
                                        <ListItemAvatar sx={{ minWidth: POSTER_WIDTH + 12 }}>
                                            <Box
                                                component="img"
                                                src={thumbnailUrl(clip.id)}
                                                alt=""
                                                sx={{
                                                    display: "block",
                                                    width: POSTER_WIDTH,
                                                    aspectRatio: "16 / 9",
                                                    objectFit: "cover",
                                                    borderRadius: 0.5,
                                                }}
                                            />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={clipName(clip)}
                                            secondary={clip.title && clip.date ? formatDate(clip.date) : undefined}
                                            slotProps={{ primary: { noWrap: true } }}
                                        />
                                    </ListItemButton>
                                ))}
                                <Box sx={{ p: 0.5 }}>
                                    <Button size="small" onClick={() => showAll()}>
                                        {hits.length > DROPDOWN_HITS ? `Show all ${hits.length} results` : "Show on the list"}
                                    </Button>
                                </Box>
                            </List>
                        )}
                    </Paper>
                </Popper>
            </Box>
        </ClickAwayListener>
    );
};
