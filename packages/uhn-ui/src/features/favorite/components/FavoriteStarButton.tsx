import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { IconButton } from "@mui/material";
import React from "react";

type FavoriteStarButtonProps = {
    isFavorite: boolean;
    onToggle: () => void;
};

export const FavoriteStarButton: React.FC<FavoriteStarButtonProps> = ({ isFavorite, onToggle }) => (
    <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 1,
            color: isFavorite ? "warning.main" : "action.disabled",
            bgcolor: "background.paper",
            opacity: isFavorite ? 1 : 0,
            transition: "opacity 0.2s",
            "&:hover": { bgcolor: "background.paper", color: "warning.main" },
            "@media (hover: none)": { opacity: 1 },
            ".tile-wrapper:hover &": { opacity: 1 },
            p: 0.5,
        }}
    >
        {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
    </IconButton>
);
