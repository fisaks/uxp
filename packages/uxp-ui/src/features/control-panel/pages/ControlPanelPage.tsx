import { Typography, useMediaQuery, useTheme } from "@mui/material";
import { generateFullLink } from "@uxp/common";
import { AppBodyContent, LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import GlobalSettingsPage from "./GlobalSettingsPage";
import NewUserRequestsPage from "./NewUserRequestsPage";
import UsersListPage from "./UsersListPage";

type ControlPanelPageProps = {
    basePath?: string;
};
export const ControlPanelPage: React.FC<ControlPanelPageProps> = ({ basePath }) => {
    console.log("ControlPanelPage", basePath);
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();

    const [pathGlobalSettings, pathNewUserRequest, pathUsers] = useMemo(() => {
        return ["global-settings", "new-user-requests", "users"];
    }, [basePath]);
    const [fullPathGlobalSettings, fullPathNewUserRequest, fullPathUsers] = useMemo(() => {
        return [
            generateFullLink(basePath, pathGlobalSettings),
            generateFullLink(basePath, pathNewUserRequest),
            generateFullLink(basePath, pathUsers),
        ];
    }, [basePath]);

    const controlaPanleMenuItems: SidebarMenuItems[] = useMemo(
        () => [
            {
                label: "Global Settings",
                link: fullPathGlobalSettings,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullPathGlobalSettings || location.pathname === basePath,
            },
            {
                label: "New User Requests",
                link: fullPathNewUserRequest,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullPathNewUserRequest,
            },
            {
                label: "Users",
                link: fullPathUsers,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullPathUsers,
            },
        ],
        [location.pathname, basePath]
    );
    return (
        <>
            <LeftSideBar isDesktop={isDesktop} menuItems={controlaPanleMenuItems} />

            <AppBodyContent appHaveOwnLeftSideBar={true}>
                <Typography variant="h1" component="h1">
                    Control Panel
                </Typography>

                <Routes>
                    <Route path={pathNewUserRequest} element={<NewUserRequestsPage />} />
                    <Route path={pathUsers} element={<UsersListPage />} />
                    <Route path="*" element={<GlobalSettingsPage />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
export default ControlPanelPage;
