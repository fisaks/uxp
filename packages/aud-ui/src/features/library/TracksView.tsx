import { Alert, Box, CircularProgress, List, ListSubheader, Stack, Typography } from "@mui/material";
import { LibraryTrack } from "@aud/common";
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { selectPlayerState } from "../player/playerSlice";
import { usePlayerActions } from "../player/usePlayerActions";
import { AddToPlaylistDialog } from "../playlist/AddToPlaylistDialog";
import { usePlaylistCommand } from "../playlist/usePlaylistCommand";
import { useRequest } from "../shared/useRequest";
import { AlbumActions } from "./AlbumActions";
import { AlbumCover } from "./AlbumCover";
import { formatDuration } from "./libraryFormat";
import { LibraryBreadcrumbs } from "./LibraryBreadcrumbs";
import { TrackRow } from "./TrackRow";

const COVER_SIZE = 120;

/** The tracks of one disc, or of the whole album when it has a single disc. */
const groupByDisc = (tracks: LibraryTrack[]): { disc?: number; tracks: LibraryTrack[] }[] => {
    const discs = [...new Set(tracks.map((track) => track.discNo))];
    return discs.length > 1 ? discs.map((disc) => ({ disc, tracks: tracks.filter((track) => track.discNo === disc) })) : [{ tracks }];
};

export const TracksView: React.FC = () => {
    const { albumId = "" } = useParams();
    const { data, error } = useRequest("library_get_tracks", { albumId });
    const { data: playlists, reload: reloadPlaylists } = useRequest("playlist_list", {});
    const { playTracks, enqueue, playNext, playNow, hadQueue, notify } = usePlayerActions();
    const sendPlaylist = usePlaylistCommand();
    const player = useAppSelector(selectPlayerState);
    // The tracks that are being put in a playlist, while the dialog for it is open.
    const [playlistTrackIds, setPlaylistTrackIds] = useState<string[] | undefined>(undefined);
    const playingId = player?.currentIndex !== undefined ? player.queue[player.currentIndex]?.id : undefined;
    // Where tracks most likely go: the playlist that was changed last.
    const lastPlaylist = useMemo(() => [...(playlists ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0], [playlists]);

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const { artist, album, tracks } = data;
    const trackIds = tracks.map((track) => track.id);
    const totalSeconds = tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0);

    const addToLastPlaylist = async (track: LibraryTrack) => {
        if (lastPlaylist && (await sendPlaylist("playlist_add_tracks", { id: lastPlaylist.id, trackIds: [track.id] }))) {
            notify(`Added "${track.title}" to "${lastPlaylist.name}"`);
            void reloadPlaylists();
        }
    };

    return (
        <>
            <LibraryBreadcrumbs
                trail={[
                    { label: "Library", to: "/library" },
                    { label: artist.name, to: `/library/artist/${artist.id}` },
                ]}
                current={album.title}
            />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                    <AlbumCover albumId={album.id} hasCover={album.hasCover} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                        {album.title}
                    </Typography>
                    <Typography color="text.secondary">
                        {[artist.name, album.year, `${tracks.length} tracks`, totalSeconds > 0 && formatDuration(totalSeconds)]
                            .filter(Boolean)
                            .join(" · ")}
                    </Typography>
                    <AlbumActions trackIds={trackIds} onAddToPlaylist={() => setPlaylistTrackIds(trackIds)} />
                </Box>
            </Stack>
            {groupByDisc(tracks).map(({ disc, tracks: discTracks }) => (
                <List
                    key={disc ?? "all"}
                    disablePadding
                    subheader={disc === undefined ? undefined : <ListSubheader disableGutters>Disc {disc}</ListSubheader>}
                >
                    {discTracks.map((track) => (
                        <TrackRow
                            key={track.id}
                            track={track}
                            artistName={artist.name}
                            playing={track.id === playingId}
                            // With a queue the track is played now and the queue is kept, without one the album is played from it.
                            onPress={() => (hadQueue ? playNow(track.id) : playTracks(trackIds, trackIds.indexOf(track.id)))}
                            onAddToQueue={() => enqueue([track.id])}
                            onPlayNext={() => playNext([track.id])}
                            lastPlaylist={lastPlaylist}
                            onAddToLastPlaylist={() => addToLastPlaylist(track)}
                            onAddToPlaylist={() => setPlaylistTrackIds([track.id])}
                            onPlayAlbumFromHere={() => playTracks(trackIds, trackIds.indexOf(track.id))}
                        />
                    ))}
                </List>
            ))}
            <AddToPlaylistDialog
                trackIds={playlistTrackIds}
                title="Add to a playlist"
                onClose={() => {
                    setPlaylistTrackIds(undefined);
                    void reloadPlaylists();
                }}
            />
        </>
    );
};
