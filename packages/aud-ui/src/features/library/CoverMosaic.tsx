import { Collection } from "@aud/common";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PersonIcon from "@mui/icons-material/Person";
import { Box } from "@mui/material";
import React from "react";
import { AlbumCover } from "./AlbumCover";
import { coverUrl } from "./libraryFormat";

const MOSAIC_MIN = 2;
const MOSAIC_MAX = 4;
const ICON_SX = { width: "40%", height: "auto" };

type CoverMosaicProps = {
    collection: Collection;
    /** The albums with a cover to show: four or more make a 2x2 mosaic, three a tall one beside two, two a pair, one shows it big, none show a person (author) or a music note. */
    albumIds: string[];
    /** Pictures from elsewhere (Spotify), shown after the albums and counted with them. */
    imageUrls?: string[];
};

/** The picture of an artist, an author or a playlist, made from the covers of its albums. It fills the width of its parent as a square. */
export const CoverMosaic: React.FC<CoverMosaicProps> = ({ collection, albumIds, imageUrls = [] }) => {
    const sources = [...albumIds.map((albumId) => coverUrl(collection, albumId)), ...imageUrls];
    if (sources.length >= MOSAIC_MIN) {
        return (
            <Box
                sx={{
                    aspectRatio: "1",
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: sources.length === 2 ? "1fr" : "1fr 1fr",
                    gap: "1px",
                    bgcolor: "background.default",
                }}
            >
                {sources.slice(0, MOSAIC_MAX).map((source, index) => (
                    <img
                        key={source}
                        src={source}
                        alt=""
                        loading="lazy"
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            minHeight: 0,
                            gridRow: sources.length === 3 && index === 0 ? "span 2" : undefined,
                        }}
                    />
                ))}
            </Box>
        );
    }
    if (albumIds.length > 0) {
        return <AlbumCover collection={collection} albumId={albumIds[0]} hasCover={true} />;
    }
    if (imageUrls.length > 0) {
        return <AlbumCover collection={collection} albumId="" hasCover={true} imageUrl={imageUrls[0]} />;
    }
    const Icon = collection === "audiobooks" ? PersonIcon : MusicNoteIcon;
    return (
        <Box
            sx={{
                aspectRatio: "1",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "action.hover",
                color: "text.disabled",
            }}
        >
            <Icon sx={ICON_SX} />
        </Box>
    );
};
