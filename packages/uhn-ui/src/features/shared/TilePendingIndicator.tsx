import { CircularProgress } from "@mui/material";
import React from "react";

type TilePendingIndicatorProps = {
    pending: boolean;
};

export const TilePendingIndicator: React.FC<TilePendingIndicatorProps> = ({ pending }) => {
    if (!pending) return null;

    return (
        <CircularProgress
            size={16}
            thickness={5}
            sx={{ position: "absolute", bottom: 11, right: 11 }}
        />
    );
};
