import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";

type FavoriteStarButtonProps = {
    isFavorite: boolean;
    onToggle: () => void;
};

export const FavoriteStarButton: React.FC<FavoriteStarButtonProps> = ({ isFavorite, onToggle }) => {
    const portalContainer = usePortalContainerRef();
    return (
        <span style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}>
            <TooltipIconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                tooltip={isFavorite ? "Remove from favorites" : "Add to favorites"}
                tooltipPortal={portalContainer}
                enterDelay={1000}
                sx={{
                    color: isFavorite ? "warning.main" : "action.disabled",
                    bgcolor: "transparent",
                    "&:hover": { bgcolor: "action.hover", color: "warning.main" },
                    p: 0.5,
                }}
            >
                {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
            </TooltipIconButton>
        </span>
    );
};
