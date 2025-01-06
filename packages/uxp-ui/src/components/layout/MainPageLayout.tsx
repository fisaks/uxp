import { useMediaQuery, useTheme } from "@mui/material";
import { PageType } from "@uxp/common";
import { LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { MainBodyContent } from "./MainBodyContent";

interface PageWrapperProps {
    children: React.ReactNode;
    pageType: PageType;
    leftSideBar?: {
        menuItems: SidebarMenuItems[];
    };
}

export const MainPageLayout: React.FC<PageWrapperProps> = ({ children, pageType, leftSideBar }) => {
    const theme = useTheme();

    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    const haveLeftSideBar = useMemo(
        () => !!(pageType === "leftNavigation" && leftSideBar?.menuItems?.length),
        [pageType, leftSideBar]
    );

    return (
        <>
            {haveLeftSideBar && <LeftSideBar isDesktop={isDesktop} menuItems={leftSideBar!.menuItems} />}

            <MainBodyContent isDesktop={isDesktop} haveLeftSideBar={haveLeftSideBar}>
                {children}
            </MainBodyContent>
        </>
    );
};
