import { useMediaQuery, useTheme } from "@mui/material";
import { generateFullLink } from "@uxp/common";
import { AppBodyContent, LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import MiscPage from "./features/template/MiscPage";


export const DemoBody = () => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();
    const basePath = useMemo(() => getBaseRoutePath(), []);

    const menuItems: SidebarMenuItems[] = useMemo(() => {
        return [
            {
                label: "Misc Demo Stuff",
                link: "misc-demo",
                component: Link,
                componentProp: "to",
                active: location.pathname === generateFullLink(basePath, "misc-info"),
            },
        ];
    }, [basePath, location.pathname]);

    return (
        <>
            <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />
            <AppBodyContent appHaveOwnLeftSideBar={true}>
                <Routes>
                    <Route path="misc-info" element={<MiscPage />} />
                    <Route path="*" element={<MiscPage />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
