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
            bgcolor: "transparent",
            "&:hover": { bgcolor: "action.hover", color: "warning.main" },
            p: 0.5,
        }}
    >
        {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
    </IconButton>
);
