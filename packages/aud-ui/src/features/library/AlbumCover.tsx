import AlbumIcon from "@mui/icons-material/Album";
import { Box } from "@mui/material";
import React, { useState } from "react";
import { coverUrl } from "./libraryFormat";

type AlbumCoverProps = {
    albumId: string;
    hasCover: boolean;
};

/** The cover of an album, or a record icon when the album has none or the picture cannot be loaded. It fills the width of its parent as a square. */
export const AlbumCover: React.FC<AlbumCoverProps> = ({ albumId, hasCover }) => {
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
                    src={coverUrl(albumId)}
                    alt=""
                    loading="lazy"
                    onError={() => setFailed(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : (
                <AlbumIcon sx={{ width: "40%", height: "auto" }} />
            )}
        </Box>
    );
};
