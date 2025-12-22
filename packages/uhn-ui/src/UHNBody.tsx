import { useMediaQuery, useTheme } from "@mui/material";
import { AppBodyContent, LeftSideBar, QUERY_PARAMS_PRINT_VIEW, SidebarMenuItems, useQuery } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import { UploadBlueprintPage } from "./features/blueprint/pages/UploadBlueprintPage";
import { TopicTracePage } from "./features/topic-trace/pages/TopicTracePage";
import { BlueprintListPage } from "./features/blueprint/pages/BlueprintListPage";
import { ResourcePage } from "./features/resource/pages/ResourcePage";

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
            {
                label: "Blueprints",
                link: "/blueprints",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/blueprints",
                children: [
                    {
                        label: "Upload Blueprint",
                        link: `/blueprints/upload`,
                        component: Link,
                        componentProp: "to",
                        active: location.pathname === "/blueprints/upload",
                    },
                ]
            },
            {
                label: "Resources",
                link: "/resources",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/resources",

            }

        ];
    }, [basePath, location.pathname]);

    return (
        <>
            {!printView && <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />}
            <AppBodyContent appHaveOwnLeftSideBar={!printView}>
                <Routes>
                    <Route path="/topic-trace" element={<TopicTracePage />} />
                    <Route path="/blueprints" element={<BlueprintListPage />} />
                    <Route path="/blueprints/upload" element={<UploadBlueprintPage />} />
                    <Route path="/resources" element={<ResourcePage />} />
                    <Route path="*" element={<TopicTracePage />} />
                </Routes>

            </AppBodyContent>
        </>
    );
};
