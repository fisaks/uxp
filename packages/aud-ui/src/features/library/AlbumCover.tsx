import { Collection } from "@aud/common";
import AlbumIcon from "@mui/icons-material/Album";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Box } from "@mui/material";
import React, { useState } from "react";
import { coverUrl } from "./libraryFormat";

const ICON_SX = { width: "40%", height: "auto" };

type AlbumCoverProps = {
    collection: Collection;
    albumId: string;
    hasCover: boolean;
};

/** The cover of an album or a book, or a record icon (a book icon for a book) when it has none or the picture cannot be loaded. It fills the width of its parent as a square. */
export const AlbumCover: React.FC<AlbumCoverProps> = ({ collection, albumId, hasCover }) => {
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
            }}
        >
            {showPicture ? (
                <img
                    src={coverUrl(collection, albumId)}
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
        </Box>
    );
};
