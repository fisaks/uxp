import { Collection, LibrarySearchHit } from "@aud/common";
import { Alert, Box, Button, Chip, CircularProgress, List, ListItemButton, ListItemText, ListSubheader, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
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

/** The results page: all the hits of the words in the header box, up to 100 per group, narrowed by chips for collection, genre and decade. */
export const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const query = params.get("q") ?? "";
    const collection = COLLECTIONS.find((item) => item.value === params.get("collection"))?.value;
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
        collection !== "audiobooks" && genre === undefined && decade === undefined,
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
    const filtered = collection !== undefined || genre !== undefined || decade !== undefined;
    const total =
        response.artists.length + response.albums.length + response.tracks.length + response.books.length + response.playlists.length + spotify.tracks.length;

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

    return (
        <>
            <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                Results for "{response.query}"
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5} sx={{ my: 1 }}>
                {COLLECTIONS.map((item) => (
                    <Chip
                        key={item.label}
                        label={item.label}
                        color="primary"
                        variant={collection === item.value ? "filled" : "outlined"}
                        onClick={() => toggle("collection", item.value)}
                    />
                ))}
                {genres.map(([name, count]) => (
                    <Chip
                        key={name}
                        label={`${name} (${count})`}
                        variant={genre === name ? "filled" : "outlined"}
                        onClick={() => toggle("genre", name)}
                    />
                ))}
                {decades.map(([start, count]) => (
                    <Chip
                        key={start}
                        label={`${start}s (${count})`}
                        variant={decade === start ? "filled" : "outlined"}
                        onClick={() => toggle("decade", String(start))}
                    />
                ))}
            </Stack>
            {filtered && (genre !== undefined || decade !== undefined) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    A genre or decade only leaves tracks and albums.
                </Typography>
            )}
            {total === 0 && <Typography color="text.secondary">Nothing found.</Typography>}
            <List disablePadding>
                {group("Artists", response.artists.length)}
                {response.artists.map((hit) => (
                    <ListItemButton key={hit.item.id} divider onClick={() => navigate(`/library/artist/${hit.item.id}`)}>
                        <ListItemText primary={text(hit, "name", hit.item.name)} />
                    </ListItemButton>
                ))}
                {group("Albums", response.albums.length)}
                {response.albums.map((hit) => (
                    <ListItemButton key={hit.item.album.id} divider onClick={() => navigate(`/library/album/${hit.item.album.id}`)}>
                        <ListItemText primary={text(hit, "title", hit.item.album.title)} secondary={text(hit, "artist", hit.item.artist)} />
                    </ListItemButton>
                ))}
                {group("Tracks", response.tracks.length)}
                {response.tracks.map((hit) => {
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
                {group("Spotify", spotify.tracks.length)}
                {spotify.tracks.map((track) => (
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
                {spotify.hasMore && (
                    <Button disabled={spotify.loading} onClick={() => void spotify.more()}>
                        More from Spotify
                    </Button>
                )}
                {group("Books", response.books.length)}
                {response.books.map((hit) => (
                    <ListItemButton key={hit.item.album.id} divider onClick={() => navigate(`/audiobooks/book/${hit.item.album.id}`)}>
                        <ListItemText primary={text(hit, "title", hit.item.album.title)} secondary={text(hit, "author", hit.item.artist)} />
                    </ListItemButton>
                ))}
                {group("Playlists", response.playlists.length)}
                {response.playlists.map((hit) => (
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
