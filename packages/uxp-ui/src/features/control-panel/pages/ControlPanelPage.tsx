import { Typography, useMediaQuery, useTheme } from "@mui/material";
import { generateFullLink } from "@uxp/common";
import { AppBodyContent, LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import React, { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import GlobalSettingsPage from "./GlobalSettingsPage";
import HealthChecksSettingsPage from "./HealthChecksSettingsPage";
import NewUserRequestsPage from "./NewUserRequestsPage";
import NotificationSettingsPage from "./NotificationSettingsPage";
import UsersListPage from "./UsersListPage";

type ControlPanelPageProps = {
    basePath?: string;
};
export const ControlPanelPage: React.FC<ControlPanelPageProps> = ({ basePath }) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();

    const [pathGlobalSettings, pathNewUserRequest, pathUsers, pathNotifications, pathHealthChecks] = useMemo(() => {
        return ["global-settings", "new-user-requests", "users", "notifications", "health-checks"];
    }, [basePath]);
    const [fullPathGlobalSettings, fullPathNewUserRequest, fullPathUsers, fullPathNotifications, fullPathHealthChecks] = useMemo(() => {
        return [
            generateFullLink(basePath, pathGlobalSettings),
            generateFullLink(basePath, pathNewUserRequest),
            generateFullLink(basePath, pathUsers),
            generateFullLink(basePath, pathNotifications),
            generateFullLink(basePath, pathHealthChecks),
        ];
    }, [basePath]);

    const controlPanelMenuItems: SidebarMenuItems[] = useMemo(
        () => [
            {
                label: "Global Settings",
                link: fullPathGlobalSettings,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullPathGlobalSettings || location.pathname === basePath,
            },
            {
                label: "Notifications",
                link: fullPathNotifications,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullPathNotifications,
            },
            {
                label: "Health Checks",
                link: fullPathHealthChecks,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullPathHealthChecks,
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
            <LeftSideBar isDesktop={isDesktop} menuItems={controlPanelMenuItems} />

            <AppBodyContent appHaveOwnLeftSideBar={true}>
                <Typography variant="h1" component="h1">
                    Control Panel
                </Typography>

                <Routes>
                    <Route path={pathNewUserRequest} element={<NewUserRequestsPage />} />
                    <Route path={pathUsers} element={<UsersListPage />} />
                    <Route path={pathNotifications} element={<NotificationSettingsPage />} />
                    <Route path={pathHealthChecks} element={<HealthChecksSettingsPage />} />
                    <Route path="*" element={<GlobalSettingsPage />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
export default ControlPanelPage;
