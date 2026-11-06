import { Alert, CircularProgress, List, ListSubheader, Typography } from "@mui/material";
import { LibraryTrack } from "@aud/common";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { selectCurrentTrackId } from "../player/playerSelectors";
import { selectMostRecentPlaylist } from "../playlist/playlistSelectors";
import { usePlayerActions } from "../player/usePlayerActions";
import { AddToPlaylistDialog } from "../playlist/AddToPlaylistDialog";
import { usePlaylistCommand } from "../playlist/usePlaylistCommand";
import { useRequest } from "../shared/useRequest";
import { AlbumGainDialog } from "./AlbumGainDialog";
import { AlbumActions } from "./AlbumActions";
import { AlbumPage } from "./AlbumPage";
import { formatDuration } from "./libraryFormat";
import { TrackRow } from "./TrackRow";

/** The tracks of one disc, or of the whole album when it has a single disc. */
const groupByDisc = (tracks: LibraryTrack[]): { disc?: number; tracks: LibraryTrack[] }[] => {
    const discs = [...new Set(tracks.map((track) => track.discNo))];
    return discs.length > 1 ? discs.map((disc) => ({ disc, tracks: tracks.filter((track) => track.discNo === disc) })) : [{ tracks }];
};

export const TracksView: React.FC = () => {
    const { albumId = "" } = useParams();
    const { data, error, reload } = useRequest("library_get_tracks", { albumId });
    useRequest("playlist_list", {});
    const { playTracks, enqueue, playNext, playNow, hadQueue, notify } = usePlayerActions();
    const sendPlaylist = usePlaylistCommand();
    // The tracks that are being put in a playlist, while the dialog for it is open.
    const [playlistTrackIds, setPlaylistTrackIds] = useState<string[] | undefined>(undefined);
    // The tracks of the album, while the dialog for their gain is open.
    const [gainTrackIds, setGainTrackIds] = useState<string[] | undefined>(undefined);
    const playingId = useAppSelector(selectCurrentTrackId);
    // Where tracks most likely go: the playlist that was changed last.
    const lastPlaylist = useAppSelector(selectMostRecentPlaylist);

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const { artist, album, tracks } = data;
    const trackIds = tracks.map((track) => track.id);
    const totalSeconds = tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0);

    const addToLastPlaylist = async (track: LibraryTrack) => {
        if (lastPlaylist && (await sendPlaylist("playlist_add_tracks", { id: lastPlaylist.id, trackIds: [track.id] }))) {
            notify(`Added "${track.title}" to "${lastPlaylist.name}"`);
        }
    };

    return (
        <>
            <AlbumPage
                collection="music"
                artistId={artist.id}
                album={album}
                info={
                    <>
                        <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                            {album.title}
                        </Typography>
                        <Typography color="text.secondary">
                            {[artist.name, album.year, `${tracks.length} tracks`, totalSeconds > 0 && formatDuration(totalSeconds)]
                                .filter(Boolean)
                                .join(" · ")}
                        </Typography>
                        <AlbumActions artistName={artist.name} trackIds={trackIds} onAddToPlaylist={() => setPlaylistTrackIds(trackIds)} onSetGain={() => setGainTrackIds(trackIds)} />
                    </>
                }
            >
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
            </AlbumPage>
            <AlbumGainDialog
                trackIds={gainTrackIds}
                currentDb={new Set(tracks.map((track) => track.gainDb ?? 0)).size === 1 ? (tracks[0].gainDb ?? 0) : undefined}
                onClose={() => setGainTrackIds(undefined)}
                onSet={() => void reload()}
            />
            <AddToPlaylistDialog trackIds={playlistTrackIds} title="Add to a playlist" onClose={() => setPlaylistTrackIds(undefined)} />
        </>
    );
};
