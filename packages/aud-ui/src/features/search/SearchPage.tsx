import { Collection, LibrarySearchHit } from "@aud/common";
import {
    Alert,
    Badge,
    Box,
    Button,
    Chip,
    IconButton,
    CircularProgress,
    Collapse,
    List,
    ListItemButton,
    ListItemText,
    ListSubheader,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { SpotifyMark } from "../library/SpotifyMark";
import { TrackRow } from "../library/TrackRow";
import { selectCurrentTrackId } from "../player/playerSelectors";
import { usePlayerActions } from "../player/usePlayerActions";
import { AddToPlaylistDialog } from "../playlist/AddToPlaylistDialog";
import { selectMostRecentPlaylist } from "../playlist/playlistSelectors";
import { usePlaylistCommand } from "../playlist/usePlaylistCommand";
import { useRequest } from "../shared/useRequest";
import { HighlightedText } from "./HighlightedText";
import { useLibrarySearch } from "./useLibrarySearch";
import { useSpotifySearch } from "./useSpotifySearch";

/** The most hits of each group on the page. */
const PAGE_LIMIT = 100;
/** The genre chips that are shown, the most common first. */
const MAX_GENRE_CHIPS = 12;
const DECADE_YEARS = 10;

const COLLECTIONS: { value: Collection | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    { value: "music", label: "Music" },
    { value: "audiobooks", label: "Audiobooks" },
];

type Source = "local" | "spotify";
type Kind = "artists" | "albums" | "tracks";

const SOURCES: { value: Source | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    { value: "local", label: "Local" },
    { value: "spotify", label: "Spotify" },
];

const KINDS: { value: Kind | undefined; label: string }[] = [
    { value: undefined, label: "Everything" },
    { value: "artists", label: "Artists" },
    { value: "albums", label: "Albums" },
    { value: "tracks", label: "Tracks" },
];

/** Chips that belong together: a thin border with the label of the group on its top edge. */
const FilterGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <Box
        component="fieldset"
        sx={{ m: 0, px: 1.25, pt: 0.25, pb: 0.75, border: "1px dashed", borderColor: "primary.main", borderRadius: 3, minWidth: 0 }}
    >
        <Typography component="legend" variant="caption" color="text.secondary" sx={{ px: 0.5, lineHeight: 1.2 }}>
            {label}
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
            {children}
        </Stack>
    </Box>
);

const text = (hit: LibrarySearchHit<unknown>, field: string, plain: string) => <HighlightedText text={hit.highlighted[field] ?? plain} />;

/** The decades of the years, with how many tracks each has, oldest first. */
const decadesOf = (years: Record<string, number>) => {
    const decades = new Map<number, number>();
    for (const [year, count] of Object.entries(years)) {
        const decade = Math.floor(Number(year) / DECADE_YEARS) * DECADE_YEARS;
        decades.set(decade, (decades.get(decade) ?? 0) + count);
    }
    return [...decades.entries()].sort(([a], [b]) => a - b);
};

/** The results page: all the hits of the words in the header box, up to 100 per group, narrowed by chips for source (library or Spotify), kind, collection, genre and decade. */
export const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("md"));
    const [moreFilters, setMoreFilters] = useState(false);
    const [params, setParams] = useSearchParams();
    const query = params.get("q") ?? "";
    const collection = COLLECTIONS.find((item) => item.value === params.get("collection"))?.value;
    const source = SOURCES.find((item) => item.value === params.get("source"))?.value;
    const kind = KINDS.find((item) => item.value === params.get("type"))?.value;
    const genre = params.get("genre") ?? undefined;
    const decade = params.has("decade") ? Number(params.get("decade")) : undefined;

    const { response, failed } = useLibrarySearch(
        query,
        {},
        {
            limit: PAGE_LIMIT,
            collection,
            genre,
            yearFrom: decade,
            yearTo: decade === undefined ? undefined : decade + DECADE_YEARS - 1,
        }
    );
    // Spotify has no genre or decade, and no audiobooks.
    const spotify = useSpotifySearch(
        query,
        source !== "local" && collection !== "audiobooks" && genre === undefined && decade === undefined,
        response?.tracks.map((hit) => hit.item) ?? []
    );
    useRequest("playlist_list", {});
    const { playTracks, enqueue, playNext, playNow, hadQueue, notify } = usePlayerActions();
    const sendPlaylist = usePlaylistCommand();
    const [playlistTrackIds, setPlaylistTrackIds] = useState<string[] | undefined>(undefined);
    const playingId = useAppSelector(selectCurrentTrackId);
    const lastPlaylist = useAppSelector(selectMostRecentPlaylist);

    /** Sets or, when it is already set, clears one filter, and keeps the rest of the address. */
    const toggle = (key: string, value: string | undefined) =>
        setParams(
            (previous) => {
                const next = new URLSearchParams(previous);
                if (value === undefined || next.get(key) === value) next.delete(key);
                else next.set(key, value);
                return next;
            },
            { replace: true }
        );

    if (!query.trim()) return <Typography color="text.secondary">Type words in the search box.</Typography>;
    if (failed) return <Alert severity="error">The search does not answer.</Alert>;
    if (!response) return <CircularProgress size={24} />;

    const genres = Object.entries(response.facets.genres)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_GENRE_CHIPS);
    const decades = decadesOf(response.facets.years);
    // The library's hits are left out when only Spotify is asked for; books and playlists belong to no kind.
    const showLocal = source !== "spotify";
    const showKind = (shown: Kind) => kind === undefined || kind === shown;
    const localArtists = showLocal && showKind("artists") ? response.artists : [];
    const localAlbums = showLocal && showKind("albums") ? response.albums : [];
    const localTracks = showLocal && showKind("tracks") ? response.tracks : [];
    const books = showLocal && kind === undefined ? response.books : [];
    const playlists = showLocal && kind === undefined ? response.playlists : [];
    const spotifyArtists = showKind("artists") ? spotify.artists : [];
    const spotifyAlbums = showKind("albums") ? spotify.albums : [];
    const spotifyTracks = showKind("tracks") ? spotify.tracks : [];
    const activeOthers = [kind, collection, genre, decade].filter((value) => value !== undefined).length;
    const filtered = collection !== undefined || genre !== undefined || decade !== undefined;
    const total =
        localArtists.length +
        localAlbums.length +
        localTracks.length +
        books.length +
        playlists.length +
        spotifyArtists.length +
        spotifyAlbums.length +
        spotifyTracks.length;

    const group = (label: string, count: number) =>
        count > 0 && (
            <ListSubheader disableGutters sx={{ bgcolor: "transparent" }}>
                {label} ({count >= PAGE_LIMIT ? `${PAGE_LIMIT}+` : count})
            </ListSubheader>
        );

    const addToLastPlaylist = async (trackId: string, title: string) => {
        if (lastPlaylist && (await sendPlaylist("playlist_add_tracks", { id: lastPlaylist.id, trackIds: [trackId] }))) {
            notify(`Added "${title}" to "${lastPlaylist.name}"`);
        }
    };

    const otherGroups = (
        <>
            <FilterGroup label="Show">
                {KINDS.map((item) => (
                    <Chip
                        size="small"
                        key={item.label}
                        label={item.label}
                        color="secondary"
                        variant={kind === item.value ? "filled" : "outlined"}
                        onClick={() => toggle("type", item.value)}
                    />
                ))}
            </FilterGroup>
            <FilterGroup label="Collection">
                {COLLECTIONS.map((item) => (
                    <Chip
                        size="small"
                        key={item.label}
                        label={item.label}
                        color="primary"
                        variant={collection === item.value ? "filled" : "outlined"}
                        onClick={() => toggle("collection", item.value)}
                    />
                ))}
            </FilterGroup>
            {genres.length > 0 && (
                <FilterGroup label="Genre">
                    {genres.map(([name, count]) => (
                        <Chip
                            size="small"
                            key={name}
                            label={`${name} (${count})`}
                            variant={genre === name ? "filled" : "outlined"}
                            onClick={() => toggle("genre", name)}
                        />
                    ))}
                </FilterGroup>
            )}
            {decades.length > 0 && (
                <FilterGroup label="Decade">
                    {decades.map(([start, count]) => (
                        <Chip
                            size="small"
                            key={start}
                            label={`${start}s (${count})`}
                            variant={decade === start ? "filled" : "outlined"}
                            onClick={() => toggle("decade", String(start))}
                        />
                    ))}
                </FilterGroup>
            )}
        </>
    );

    const sourceGroup = (
        <FilterGroup label="Source">
            {SOURCES.map((item) => (
                <Chip
                    size="small"
                    key={item.label}
                    label={item.label}
                    color="secondary"
                    variant={source === item.value ? "filled" : "outlined"}
                    onClick={() => toggle("source", item.value)}
                />
            ))}
        </FilterGroup>
    );

    return (
        <>
            <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                Results for "{response.query}"
            </Typography>
            <Stack direction={wide ? "row" : "column"} flexWrap="wrap" useFlexGap columnGap={1} rowGap={1} sx={{ my: 1 }}>
                {wide ? (
                    sourceGroup
                ) : (
                    <Stack direction="row" alignItems="stretch" spacing={1}>
                        {sourceGroup}
                        <IconButton
                            size="small"
                            aria-label="More filters"
                            color={moreFilters || activeOthers > 0 ? "primary" : "default"}
                            onClick={() => setMoreFilters(!moreFilters)}
                            // The label of the box sticks half a line above its border: the button starts at the border, not at the label.
                            sx={{ mt: "7px", px: 1.25, }}
                        >
                            <Badge badgeContent={activeOthers} color="primary" sx={{ mt: "7px" }}>
                                <TuneIcon fontSize="small" />
                            </Badge>
                        </IconButton>
                    </Stack>
                )}
                {wide ? (
                    otherGroups
                ) : (
                    <Collapse in={moreFilters}>
                        <Stack spacing={1}>{otherGroups}</Stack>
                    </Collapse>
                )}
            </Stack>
            {filtered && (genre !== undefined || decade !== undefined) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    A genre or decade only leaves tracks and albums of the library.
                </Typography>
            )}
            {total === 0 && <Typography color="text.secondary">Nothing found.</Typography>}
            <List disablePadding>
                {group("Artists", localArtists.length + spotifyArtists.length)}
                {localArtists.map((hit) => (
                    <ListItemButton key={hit.item.id} divider onClick={() => navigate(`/library/artist/${hit.item.id}`)}>
                        <ListItemText primary={text(hit, "name", hit.item.name)} />
                    </ListItemButton>
                ))}
                {spotifyArtists.map((artist) => (
                    <ListItemButton key={artist.id} divider onClick={() => navigate(`/library/artist/${artist.id}`)}>
                        <ListItemText
                            primary={
                                <>
                                    <SpotifyMark />
                                    {artist.name}
                                </>
                            }
                        />
                    </ListItemButton>
                ))}
                {group("Albums", localAlbums.length + spotifyAlbums.length)}
                {localAlbums.map((hit) => (
                    <ListItemButton key={hit.item.album.id} divider onClick={() => navigate(`/library/album/${hit.item.album.id}`)}>
                        <ListItemText primary={text(hit, "title", hit.item.album.title)} secondary={text(hit, "artist", hit.item.artist)} />
                    </ListItemButton>
                ))}
                {spotifyAlbums.map((album) => (
                    <ListItemButton key={album.id} divider onClick={() => navigate(`/library/album/${album.id}`)}>
                        <ListItemText
                            primary={
                                <>
                                    <SpotifyMark />
                                    {album.title}
                                </>
                            }
                            secondary={[album.year, `${album.trackCount} tracks`].filter(Boolean).join(" · ")}
                        />
                    </ListItemButton>
                ))}
                {group("Tracks", localTracks.length)}
                {localTracks.map((hit) => {
                    const track = hit.item;
                    return (
                        <TrackRow
                            key={track.id}
                            track={track}
                            artistName=""
                            primary={text(hit, "title", track.title)}
                            secondary={
                                <>
                                    {text(hit, "artist", track.artist)} · {text(hit, "album", track.albumTitle)}
                                </>
                            }
                            playing={track.id === playingId}
                            // With a queue the track is played now and the queue is kept, as in an album.
                            onPress={() => (hadQueue ? playNow(track.id) : playTracks([track.id]))}
                            onAddToQueue={() => enqueue([track.id])}
                            onPlayNext={() => playNext([track.id])}
                            lastPlaylist={lastPlaylist}
                            onAddToLastPlaylist={() => addToLastPlaylist(track.id, track.title)}
                            onAddToPlaylist={() => setPlaylistTrackIds([track.id])}
                        />
                    );
                })}
                {group("Spotify", spotifyTracks.length)}
                {spotifyTracks.map((track) => (
                    <TrackRow
                        key={track.id}
                        track={track}
                        artistName=""
                        primary={track.title}
                        secondary={`${track.artist} · ${track.albumTitle}`}
                        playing={track.id === playingId}
                        onPress={() => (hadQueue ? playNow(track.id) : playTracks([track.id]))}
                        onAddToQueue={() => enqueue([track.id])}
                        onPlayNext={() => playNext([track.id])}
                        lastPlaylist={lastPlaylist}
                        onAddToLastPlaylist={() => addToLastPlaylist(track.id, track.title)}
                        onAddToPlaylist={() => setPlaylistTrackIds([track.id])}
                    />
                ))}
                {spotify.hasMore && spotifyTracks.length > 0 && (
                    <Button disabled={spotify.loading} onClick={() => void spotify.more()}>
                        More from Spotify
                    </Button>
                )}
                {group("Books", books.length)}
                {books.map((hit) => (
                    <ListItemButton key={hit.item.album.id} divider onClick={() => navigate(`/audiobooks/book/${hit.item.album.id}`)}>
                        <ListItemText primary={text(hit, "title", hit.item.album.title)} secondary={text(hit, "author", hit.item.artist)} />
                    </ListItemButton>
                ))}
                {group("Playlists", playlists.length)}
                {playlists.map((hit) => (
                    <ListItemButton key={hit.item.id} divider onClick={() => navigate(`/playlists/${hit.item.id}`)}>
                        <ListItemText primary={text(hit, "name", hit.item.name)} />
                    </ListItemButton>
                ))}
            </List>
            <Box sx={{ height: 1 }} />
            <AddToPlaylistDialog trackIds={playlistTrackIds} title="Add to a playlist" onClose={() => setPlaylistTrackIds(undefined)} />
        </>
    );
};
