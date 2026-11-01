import { LibrarySearchContext, LibrarySearchHit } from "@aud/common";
import ClearIcon from "@mui/icons-material/Clear";
import HistoryIcon from "@mui/icons-material/History";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import SearchIcon from "@mui/icons-material/Search";
import {
    Box,
    Button,
    ClickAwayListener,
    InputAdornment,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Paper,
    Popper,
    TextField,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useRef, useState } from "react";
import { useMatch, useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { selectCurrentTrackId } from "../player/playerSelectors";
import { usePlayerActions } from "../player/usePlayerActions";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { useRequest } from "../shared/useRequest";
import { HighlightedText } from "./HighlightedText";
import { clearRecentSearches, loadRecentSearches, rememberSearch } from "./recentSearches";
import { useLibrarySearch } from "./useLibrarySearch";
import { SEARCH_PATH, searchPagePath } from "./searchPath";

const DROPDOWN_MAX_HEIGHT = "70vh";
// The room for the + button at the right of a track.
const ROOM_FOR_BUTTON = 6;

/** Where the user is in the library, which makes the hits of that artist or album come first. */
const useSearchContext = (): LibrarySearchContext => {
    const albumId = useMatch("/library/album/:albumId")?.params.albumId;
    const artistId = useMatch("/library/artist/:artistId")?.params.artistId;
    return { albumId, artistId };
};

const text = (hit: LibrarySearchHit<unknown>, field: string, plain: string) => <HighlightedText text={hit.highlighted[field] ?? plain} />;

/**
 * The search box of the app: while typing, a dropdown shows the best few hits of the artists, albums, tracks, books and
 * playlists, and with an empty box the last searches. It is left out when the server has no search.
 */
export const SearchBox: React.FC = () => {
    const navigate = useNavigate();
    const portalContainer = usePortalContainerRef();
    const { data } = useRequest("library_get_artists", {});
    const context = useSearchContext();
    const { playTracks, playNow, enqueue, hadQueue } = usePlayerActions();
    const playingId = useAppSelector(selectCurrentTrackId);
    const anchorRef = useRef<HTMLDivElement>(null);
    // On the results page the box starts with the words of the page.
    const onResultsPage = useMatch(SEARCH_PATH) !== null;
    const [searchParams] = useSearchParams();
    const [query, setQuery] = useState(() => (onResultsPage ? (searchParams.get("q") ?? "") : ""));
    const [open, setOpen] = useState(false);
    const [recent, setRecent] = useState(loadRecentSearches);
    const { response, failed } = useLibrarySearch(query, context);

    if (!data?.status.searchAvailable) return null;

    const trimmed = query.trim();
    const hitCount = response
        ? response.artists.length + response.albums.length + response.tracks.length + response.books.length + response.playlists.length
        : 0;

    /** Shows all the hits of the words on the results page. */
    const showAll = (words = query) => {
        const wanted = words.trim();
        if (!wanted) return;
        setRecent(rememberSearch(wanted));
        setOpen(false);
        navigate(searchPagePath(wanted));
    };

    /** Opens what the hit is, remembers the search and closes the dropdown. */
    const choose = (action: () => void) => () => {
        setRecent(rememberSearch(query));
        setOpen(false);
        action();
    };

    const subheader = (label: string) => <ListSubheader sx={{ lineHeight: "32px" }}>{label}</ListSubheader>;

    return (
        <ClickAwayListener onClickAway={() => setOpen(false)}>
            <Box ref={anchorRef} sx={{ minWidth: 0 }}>
                <TextField
                    size="small"
                    fullWidth
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
                                    <LabelledIconButton label="Clear the search" onClick={() => setQuery("")}>
                                        <ClearIcon fontSize="small" />
                                    </LabelledIconButton>
                                </InputAdornment>
                            ) : undefined,
                        },
                    }}
                />
                <Popper
                    open={open && (trimmed ? true : recent.length > 0)}
                    anchorEl={anchorRef.current}
                    container={portalContainer.current}
                    placement="bottom-start"
                    sx={{ zIndex: (theme) => theme.zIndex.modal, width: anchorRef.current?.clientWidth }}
                >
                    <Paper elevation={8} sx={{ mt: 0.5, maxHeight: DROPDOWN_MAX_HEIGHT, overflowY: "auto", minWidth: 280 }}>
                        {!trimmed && (
                            <List dense disablePadding subheader={subheader("Recent searches")}>
                                {recent.map((item) => (
                                    <ListItemButton
                                        key={item}
                                        onClick={() => {
                                            setQuery(item);
                                            showAll(item);
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                            <HistoryIcon fontSize="small" color="info" />
                                        </ListItemIcon>
                                        <ListItemText primary={item} />
                                    </ListItemButton>
                                ))}
                                <Box sx={{ p: 0.5 }}>
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            clearRecentSearches();
                                            setRecent([]);
                                        }}
                                    >
                                        Clear recent searches
                                    </Button>
                                </Box>
                            </List>
                        )}
                        {trimmed && failed && (
                            <Typography color="text.secondary" sx={{ p: 1.5 }}>
                                The search does not answer.
                            </Typography>
                        )}
                        {trimmed && !failed && response && hitCount === 0 && (
                            <Typography color="text.secondary" sx={{ p: 1.5 }}>
                                Nothing found.
                            </Typography>
                        )}
                        {trimmed && !failed && response && hitCount > 0 && (
                            <List dense disablePadding>
                                {response.artists.length > 0 && subheader("Artists")}
                                {response.artists.map((hit) => (
                                    <ListItemButton key={hit.item.id} onClick={choose(() => navigate(`/library/artist/${hit.item.id}`))}>
                                        <ListItemText primary={text(hit, "name", hit.item.name)} />
                                    </ListItemButton>
                                ))}
                                {response.albums.length > 0 && subheader("Albums")}
                                {response.albums.map((hit) => (
                                    <ListItemButton
                                        key={hit.item.album.id}
                                        onClick={choose(() => navigate(`/library/album/${hit.item.album.id}`))}
                                    >
                                        <ListItemText
                                            primary={text(hit, "title", hit.item.album.title)}
                                            secondary={text(hit, "artist", hit.item.artist)}
                                        />
                                    </ListItemButton>
                                ))}
                                {response.tracks.length > 0 && subheader("Tracks")}
                                {response.tracks.map((hit) => {
                                    const track = hit.item;
                                    return (
                                        <ListItem
                                            key={track.id}
                                            disablePadding
                                            secondaryAction={
                                                <LabelledIconButton label="Add to queue" onClick={() => void enqueue([track.id])}>
                                                    <PlaylistAddIcon fontSize="small" />
                                                </LabelledIconButton>
                                            }
                                        >
                                            <ListItemButton
                                                selected={track.id === playingId}
                                                sx={{ pr: ROOM_FOR_BUTTON }}
                                                // With a queue the track is played now and the queue is kept, as in an album.
                                                onClick={choose(() => (hadQueue ? void playNow(track.id) : void playTracks([track.id])))}
                                            >
                                                <ListItemText
                                                    primary={text(hit, "title", track.title)}
                                                    secondary={
                                                        <>
                                                            {text(hit, "artist", track.artist)} · {text(hit, "album", track.albumTitle)}
                                                        </>
                                                    }
                                                />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })}
                                {response.books.length > 0 && subheader("Books")}
                                {response.books.map((hit) => (
                                    <ListItemButton
                                        key={hit.item.album.id}
                                        onClick={choose(() => navigate(`/audiobooks/book/${hit.item.album.id}`))}
                                    >
                                        <ListItemText
                                            primary={text(hit, "title", hit.item.album.title)}
                                            secondary={text(hit, "author", hit.item.artist)}
                                        />
                                    </ListItemButton>
                                ))}
                                {response.playlists.length > 0 && subheader("Playlists")}
                                {response.playlists.map((hit) => (
                                    <ListItemButton key={hit.item.id} onClick={choose(() => navigate(`/playlists/${hit.item.id}`))}>
                                        <ListItemText primary={text(hit, "name", hit.item.name)} />
                                    </ListItemButton>
                                ))}
                                <Box sx={{ p: 0.5 }}>
                                    <Button size="small" onClick={() => showAll()}>
                                        Show all results
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
