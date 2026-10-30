import { LibraryTrack } from "@aud/common";
import { Alert, Box, CircularProgress, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import React from "react";
import { useParams } from "react-router-dom";
import { AlbumCover } from "../library/AlbumCover";
import { formatDuration } from "../library/libraryFormat";
import { LibraryBreadcrumbs } from "../library/LibraryBreadcrumbs";
import { useRequest } from "../shared/useRequest";

const COVER_SIZE = 120;

/** "Part 3", with the disc in front when the book has several: "Disc 2 · Part 3". A book of one file is "Whole book". */
export const partNames = (parts: LibraryTrack[]): string[] => {
    if (parts.length === 1) return ["Whole book"];
    const discs = [...new Set(parts.map((part) => part.discNo))];
    return parts.map((part) => {
        const sameDisc = parts.filter((other) => other.discNo === part.discNo);
        const name = `Part ${sameDisc.indexOf(part) + 1}`;
        return discs.length > 1 && part.discNo !== undefined ? `Disc ${part.discNo} · ${name}` : name;
    });
};

export const BookView: React.FC = () => {
    const { bookId = "" } = useParams();
    const { data, error } = useRequest("audiobook_get_parts", { albumId: bookId });

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const { artist, album, tracks } = data;
    const totalSeconds = tracks.reduce((sum, part) => sum + (part.durationSec ?? 0), 0);
    const names = partNames(tracks);

    return (
        <>
            <LibraryBreadcrumbs
                trail={[
                    { label: "Audiobooks", to: "/audiobooks" },
                    { label: artist.name, to: `/audiobooks/author/${artist.id}` },
                ]}
                current={album.title}
            />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: COVER_SIZE, flexShrink: 0 }}>
                    <AlbumCover collection="audiobooks" albumId={album.id} hasCover={album.hasCover} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h5" sx={{ overflowWrap: "anywhere" }}>
                        {album.title}
                    </Typography>
                    <Typography color="text.secondary">
                        {[
                            artist.name,
                            tracks.length === 1 ? undefined : `${tracks.length} parts`,
                            totalSeconds > 0 && formatDuration(totalSeconds),
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </Typography>
                </Box>
            </Stack>
            <List disablePadding>
                {tracks.map((part, index) => (
                    <ListItem key={part.id} disableGutters divider>
                        <ListItemText primary={names[index]} secondary={part.durationSec ? formatDuration(part.durationSec) : undefined} />
                    </ListItem>
                ))}
            </List>
        </>
    );
};
