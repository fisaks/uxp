import { Box } from "@mui/material";
import { useQuery } from "@uxp/ui-lib";
import React from "react";

type BodyContentProps = {
    children: React.ReactNode;
    isDesktop: boolean;
    haveLeftSideBar: boolean;
};
export const MainBodyContent: React.FC<BodyContentProps> = ({ children, isDesktop, haveLeftSideBar }) => {
    const query = useQuery();
    const printView = query.get("printView") === "true";
    return (
        <Box
            id="uxp-main-body-content"
            sx={{
                flexGrow: 1,
                p: printView ? 0: 3,
                ml: isDesktop && haveLeftSideBar ? "15rem" : 0,
                pt: printView ? 0 : 8, // Space below the AppBar
            }}
        >
            {children}
        </Box>
    );
};
