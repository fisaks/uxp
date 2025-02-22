import { useMediaQuery, useTheme } from "@mui/material";
import { generateFullLink } from "@uxp/common";
import { AppBodyContent, LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import HouseInfoPage from "./features/house/pages/HouseInfoPage";

export const H2CBody = () => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();
    const basePath = useMemo(() => getBaseRoutePath(), []);

    const menuItems: SidebarMenuItems[] = useMemo(() => {
        return [
            {
                label: "House Management",
                link: "/house-info",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/house-info" || location.pathname === "/",
            },
        ];
    }, [basePath, location.pathname]);

    return (
        <>
            <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />
            <AppBodyContent appHaveOwnLeftSideBar={true}>
                <Routes>
                    <Route path="/house-info" element={<HouseInfoPage />} />
                    <Route path="*" element={<HouseInfoPage />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
