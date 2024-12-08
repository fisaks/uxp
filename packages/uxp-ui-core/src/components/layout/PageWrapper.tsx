import { Box } from "@mui/material";
import React from "react";

interface PageWrapperProps {
    children: React.ReactNode;
    isDesktop: boolean;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children, isDesktop }) => {
    return (
        <Box
            sx={{
                flexGrow: 1,
                p: 3,
                ml: isDesktop ? "15rem" : 0, // Adjust margin for sidebar width in desktop view
                mt: 8, // Space below the AppBar
            }}
        >
            {children}
        </Box>
    );
};

export default PageWrapper;
