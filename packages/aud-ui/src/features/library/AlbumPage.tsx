import { Collection, LibraryAlbum } from "@aud/common";
import { Box, Stack, Typography } from "@mui/material";
import React, { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRequest } from "../shared/useRequest";
import { AlbumCover } from "./AlbumCover";
import { PAGE_WIDTH, READABLE_WIDTH, SIDE_COLUMN_GAP, SIDE_COLUMN_WIDTH } from "../shared/ReadableWidth";
import { Tile } from "./TileGrid";

const COVER_SIZE = 120;
const STRIP_TILE_WIDTH = 140;
/** Where the side column sticks: just under the top bar of the page. */
const TOP_BAR_HEIGHT = 56;
const SIDE_GAP = 16;

/** How far the column of albums was scrolled when an album was picked from it, as the page of the next one is a new page. */
let columnScroll = { artistId: "", top: 0 };

const SIBLINGS_ACTION = { music: "library_get_albums", audiobooks: "audiobook_get_books" } as const;
const ALBUM_PATH = { music: "/library/album", audiobooks: "/audiobooks/book" } as const;

type AlbumPageProps = {
    collection: Collection;
    artistId: string;
    album: LibraryAlbum;
    /** What is written next to the cover: title, details and actions. */
    info: React.ReactNode;
    /** The tracks or parts. */
    children: React.ReactNode;
};

/**
 * The page of one album or book. On a wide screen the other albums of the artist stand in a column beside it, with the current one marked,
 * or a big cover when the artist has no other. On a phone they are a strip below the tracks.
 */
export const AlbumPage: React.FC<AlbumPageProps> = ({ collection, artistId, album, info, children }) => {
    const navigate = useNavigate();
    // The album the page was opened on stays first while the others are picked from the column, so the column does not move under the pointer.
    const leadId = (useLocation().state as { leadId?: string } | null)?.leadId ?? album.id;
    const { data } = useRequest(SIBLINGS_ACTION[collection], { artistId });
    const albums = [...(data?.albums ?? [])].sort((a, b) => Number(b.id === leadId) - Number(a.id === leadId));
    const others = albums.filter((other) => other.id !== album.id);
    const hasOthers = others.length > 0;
    const columnRef = useRef<HTMLDivElement>(null);
    // Picking an album opens a new page, so the column is put back to where it was, as long as it is the same artist's.
    useLayoutEffect(() => {
        if (columnRef.current && columnScroll.artistId === artistId) columnRef.current.scrollTop = columnScroll.top;
    }, [artistId, hasOthers]);

    const albumTile = (other: LibraryAlbum) => (
        <Tile
            key={other.id}
            picture={<AlbumCover collection={collection} albumId={other.id} hasCover={other.hasCover} />}
            title={other.title}
            subtitle={other.year ? String(other.year) : undefined}
            highlighted={other.id === album.id}
            onClick={() => navigate(`${ALBUM_PATH[collection]}/${other.id}`, { state: { leadId } })}
        />
    );

    return (
        <Box
            sx={{
                display: { md: "flex" },
                gap: `${SIDE_COLUMN_GAP}px`,
                alignItems: "flex-start",
                maxWidth: PAGE_WIDTH,
                mx: "auto",
            }}
        >
            <Box
                sx={{
                    display: { xs: "none", md: "block" },
                    width: SIDE_COLUMN_WIDTH,
                    flexShrink: 0,
                    position: "sticky",
                    top: TOP_BAR_HEIGHT + SIDE_GAP,
                }}
            >
                {hasOthers ? (
                    <Stack
                        ref={columnRef}
                        onScroll={(event) => {
                            columnScroll = { artistId, top: event.currentTarget.scrollTop };
                        }}
                        spacing={2}
                        sx={{
                            maxHeight: `calc(100vh - ${TOP_BAR_HEIGHT + 2 * SIDE_GAP}px)`,
                            overflowY: "auto",
                            p: 0.5,
                            "& > *": { flexShrink: 0 },
                            // A thin bar in the colours of the theme instead of the wide native one.
                            scrollbarWidth: "thin",
                            scrollbarColor: (theme) => `${theme.palette.action.disabled} transparent`,
                        }}
                    >
                        {albums.map(albumTile)}
                    </Stack>
                ) : (
                    <AlbumCover collection={collection} albumId={album.id} hasCover={album.hasCover} />
                )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, maxWidth: READABLE_WIDTH }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    {/* Without other albums the big cover beside the page already shows it on a wide screen. */}
                    <Box sx={{ width: COVER_SIZE, flexShrink: 0, display: { xs: "block", md: hasOthers ? "block" : "none" } }}>
                        <AlbumCover collection={collection} albumId={album.id} hasCover={album.hasCover} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>{info}</Box>
                </Stack>
                {children}
                {hasOthers && (
                    <Box sx={{ display: { md: "none" }, mt: 3 }}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            More by this {collection === "audiobooks" ? "author" : "artist"}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ overflowX: "auto", pb: 1 }}>
                            {others.map((other) => (
                                <Box key={other.id} sx={{ width: STRIP_TILE_WIDTH, flexShrink: 0 }}>
                                    {albumTile(other)}
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                )}
            </Box>
        </Box>
    );
};
