import React from "react";
import { Fab } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

interface FloatingSidebarButtonProps {
    toggleSidebar: () => void;
}

const FloatingSidebarButton: React.FC<FloatingSidebarButtonProps> = ({ toggleSidebar }) => {
    return (
        <Fab
            color="primary"
            onClick={toggleSidebar}
            size="small"
            sx={{
                position: "fixed",
                bottom: "50%",
                left: 0,
                transform: "translateY(-50%) translateX(-30%)",
            }}
        >
            <ChevronRightIcon />
        </Fab>
    );
};

export default FloatingSidebarButton;
