import Tune from "@mui/icons-material/Tune";
import { IconButton } from "@mui/material";
import React from "react";

export type SystemCenterButtonProps = {
    onClick: () => void;
};

export const SystemCenterButton: React.FC<SystemCenterButtonProps> = ({ onClick }) => {
    return (
        <IconButton color="inherit" onClick={onClick} sx={{ ml: 1 }} aria-label="System Center">
            <Tune />
        </IconButton>
    );
};
