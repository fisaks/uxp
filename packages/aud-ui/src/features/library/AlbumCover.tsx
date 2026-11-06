import { Collection } from "@aud/common";
import AlbumIcon from "@mui/icons-material/Album";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Box } from "@mui/material";
import React, { useState } from "react";
import { coverUrl } from "./libraryFormat";

// The green of Spotify, which tells at a glance that the music is not from the library.
export const SPOTIFY_GREEN = "#1DB954";
const ICON_SX = { width: "40%", height: "auto" };

type AlbumCoverProps = {
    collection: Collection;
    albumId: string;
    hasCover: boolean;
    /** A picture from elsewhere (the cover of a Spotify track), shown instead of the cover of the library. */
    imageUrl?: string;
    /** A short word across the bottom of the cover, for example "Spotify", telling where the music comes from. */
    banner?: string;
};

/** The cover of an album or a book, or a record icon (a book icon for a book) when it has none or the picture cannot be loaded. It fills the width of its parent as a square. */
export const AlbumCover: React.FC<AlbumCoverProps> = ({ collection, albumId, hasCover, imageUrl, banner }) => {
    const [failed, setFailed] = useState(false);
    const showPicture = hasCover && !failed;
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
                overflow: "hidden",
                position: "relative",
                containerType: "inline-size",
            }}
        >
            {showPicture ? (
                <img
                    src={imageUrl ?? coverUrl(collection, albumId)}
                    alt=""
                    loading="lazy"
                    onError={() => setFailed(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : collection === "audiobooks" ? (
                <MenuBookIcon sx={ICON_SX} />
            ) : (
                <AlbumIcon sx={ICON_SX} />
            )}
            {banner && (
                <Box
                    sx={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        py: "1px",
                        textAlign: "center",
                        bgcolor: SPOTIFY_GREEN,
                        color: "#000",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        lineHeight: 1.3,
                        // Scales with the cover, so that it fits the small cover of the bar and the large one of the full screen player.
                        fontSize: "clamp(7px, 13cqw, 16px)",
                        textTransform: "uppercase",
                    }}
                >
                    {banner}
                </Box>
            )}
        </Box>
    );
};
