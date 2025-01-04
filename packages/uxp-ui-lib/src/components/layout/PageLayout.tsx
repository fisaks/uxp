import { Box, useMediaQuery, useTheme } from "@mui/material";
import { PageType } from "@uxp/common";
import React, { useMemo, useState } from "react";
import { FloatingSidebarButton } from "./FloatingSidebarButton";
import { Sidebar, SidebarMenuItems } from "./Sidebar";

interface PageWrapperProps {
    children: React.ReactNode;
    pageType: PageType;
    leftSideBar?: {
        menuItems: SidebarMenuItems[];
    };
}

export const PageLayout: React.FC<PageWrapperProps> = ({ children, pageType, leftSideBar }) => {
    const theme = useTheme();

    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const haveLeftSideBar = useMemo(
        () => pageType === "leftNavigation" && leftSideBar?.menuItems?.length,
        [pageType, leftSideBar]
    );

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <>
            {haveLeftSideBar && (
                <>
                    <Sidebar
                        isDesktop={isDesktop}
                        sidebarOpen={sidebarOpen}
                        toggleSidebar={toggleSidebar}
                        sidebarMenuItems={leftSideBar?.menuItems ?? []}
                    />
                    {!isDesktop && <FloatingSidebarButton toggleSidebar={toggleSidebar} />}
                </>
            )}

            <Box
                sx={{
                    flexGrow: 1,
                    p: 3,
                    ml: isDesktop && haveLeftSideBar ? "15rem" : 0,
                    mt: 8, // Space below the AppBar
                }}
            >
                {children}
            </Box>
        </>
    );
};
