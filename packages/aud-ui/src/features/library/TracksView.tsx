import { Alert, Box, CircularProgress, List, ListItem, ListItemText, ListSubheader, Stack, Typography } from "@mui/material";
import { LibraryTrack } from "@aud/common";
import React from "react";
import { useParams } from "react-router-dom";
import { AlbumCover } from "./AlbumCover";
import { formatDuration } from "./libraryFormat";
import { LibraryBreadcrumbs } from "./LibraryBreadcrumbs";
import { useLibraryRequest } from "./useLibraryRequest";

const COVER_SIZE = 120;

/** The tracks of one disc, or of the whole album when it has a single disc. */
const groupByDisc = (tracks: LibraryTrack[]): { disc?: number; tracks: LibraryTrack[] }[] => {
    const discs = [...new Set(tracks.map((track) => track.discNo))];
    return discs.length > 1 ? discs.map((disc) => ({ disc, tracks: tracks.filter((track) => track.discNo === disc) })) : [{ tracks }];
};

export const TracksView: React.FC = () => {
    const { albumId = "" } = useParams();
    const { data, error } = useLibraryRequest("library_get_tracks", { albumId });

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const { artist, album, tracks } = data;
    const totalSeconds = tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0);

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
                </Box>
            </Stack>
            {groupByDisc(tracks).map(({ disc, tracks: discTracks }) => (
                <List
                    key={disc ?? "all"}
                    disablePadding
                    subheader={disc === undefined ? undefined : <ListSubheader disableGutters>Disc {disc}</ListSubheader>}
                >
                    {discTracks.map((track) => (
                        <ListItem
                            key={track.id}
                            disableGutters
                            divider
                            secondaryAction={
                                <Typography color="text.secondary">{track.durationSec ? formatDuration(track.durationSec) : ""}</Typography>
                            }
                        >
                            <Typography color="text.secondary" sx={{ width: 32, flexShrink: 0 }}>
                                {track.trackNo ?? ""}
                            </Typography>
                            <ListItemText
                                primary={track.title}
                                secondary={track.artist !== artist.name ? track.artist : undefined}
                                slotProps={{ primary: { sx: { overflowWrap: "anywhere" } } }}
                                sx={{ pr: 6 }}
                            />
                        </ListItem>
                    ))}
                </List>
            ))}
        </>
    );
};
