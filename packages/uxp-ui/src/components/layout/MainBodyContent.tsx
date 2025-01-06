import { Box } from "@mui/material";
import React from "react";

type BodyContentProps = {
    children: React.ReactNode;
    isDesktop: boolean;
    haveLeftSideBar: boolean;
};
export const MainBodyContent: React.FC<BodyContentProps> = ({ children, isDesktop, haveLeftSideBar }) => {
    return (
        <Box
            id="uxp-main-body-content"
            sx={{
                flexGrow: 1,
                p: 3,
                ml: isDesktop && haveLeftSideBar ? "15rem" : 0,
                pt: 8, // Space below the AppBar
            }}
        >
            {children}
        </Box>
    );
};
