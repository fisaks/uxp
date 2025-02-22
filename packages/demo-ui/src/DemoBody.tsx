import { useMediaQuery, useTheme } from "@mui/material";
import { generateFullLink } from "@uxp/common";
import { AppBodyContent, LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { getBaseRoutePath } from "./config";
import AsyncMessagingPage from "./features/async-ws-msg/AsyncMessagingPage";
import BinaryMessagingPage from "./features/binray-ws-msg/BinaryMessagingPage";
import ChatPage from "./features/chat/ChatPage";
import RichEditPage from "./features/rich-edit/RichEditPage";
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
            {
                label: "WS Chat",
                link: "chat",
                component: Link,
                componentProp: "to",
                active: location.pathname === generateFullLink(basePath, "chat"),
            },
            {
                label: "Async WS Messages",
                link: "async-ws-msg",
                component: Link,
                componentProp: "to",
                active: location.pathname === generateFullLink(basePath, "async-ws-msg"),
            },
            {
                label: "Binary WS Messages",
                link: "binary-ws-msg",
                component: Link,
                componentProp: "to",
                active: location.pathname === generateFullLink(basePath, "binary-ws-msg"),
            },

            {
                label: "Rich Text Editor",
                link: "rich-text-editor",
                component: Link,
                componentProp: "to",
                active: location.pathname === generateFullLink(basePath, "rich-text-editor"),
            },
        ];
    }, [basePath, location.pathname]);

    return (
        <>
            <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />
            <AppBodyContent appHaveOwnLeftSideBar={true}>
                <Routes>
                    <Route path="misc-demo" element={<MiscPage />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="async-ws-msg" element={<AsyncMessagingPage />} />
                    <Route path="binary-ws-msg" element={<BinaryMessagingPage />} />
                    <Route path="rich-text-editor" element={<RichEditPage />} />
                    <Route path="*" element={<MiscPage />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
