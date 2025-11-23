import { useMediaQuery, useTheme } from "@mui/material";
import { AppBodyContent, LeftSideBar, QUERY_PARAMS_PRINT_VIEW, SidebarMenuItems, useQuery } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import { TopicTracePage } from "./features/topic-trace/pages/TopicTracePage";

export const UHNBody = () => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();
    const basePath = useMemo(() => getBaseRoutePath(), []);
    const query = useQuery()
    const printView = query.get(QUERY_PARAMS_PRINT_VIEW) === "true";
    const menuItems: SidebarMenuItems[] = useMemo(() => {
        return [
            {
                label: "Topic Trace",
                link: "/topic-trace",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/topic-trace" || location.pathname === "/",
            },

        ];
    }, [basePath, location.pathname]);

    return (
        <>
            {!printView && <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />}
            <AppBodyContent appHaveOwnLeftSideBar={!printView}>
                <Routes>
                    <Route path="/topic-trace" element={<TopicTracePage />} />
                    <Route path="*" element={<TopicTracePage />} />
                </Routes>
                
            </AppBodyContent>
        </>
    );
};
