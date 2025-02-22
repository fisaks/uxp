import { useMediaQuery, useTheme } from "@mui/material";
import { AppBodyContent, LeftSideBar, SidebarMenuItems } from "@uxp/ui-lib";
import { useMemo } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import AsyncMessagingPage from "./features/async-ws-msg/AsyncMessagingPage";
import BinaryMessagingPage from "./features/binray-ws-msg/BinaryMessagingPage";
import ChatPage from "./features/chat/ChatPage";
import RichEditPage from "./features/rich-edit/RichEditPage";
import MiscPage from "./features/template/MiscPage";


export const DemoBody = () => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const location = useLocation();
    const menuItems: SidebarMenuItems[] = useMemo(() => {
        return [
            {
                label: "Misc Demo Stuff",
                link: "misc-demo",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/misc-demo" || location.pathname === "/",
            },
            {
                label: "WebSockets",
                link: null,
                children: [
                    {
                        label: "Chat",
                        link: "/ws/chat",
                        component: Link,
                        componentProp: "to",
                        active: location.pathname === "/ws/chat",
                    },
                    {
                        label: "Async Messages",
                        link: "/ws/async-msg",
                        component: Link,
                        componentProp: "to",
                        active: location.pathname === "/ws/async-msg",
                    },
                    {
                        label: "Binary Messages",
                        link: null,
                        children: [
                            {
                                label: "Request Messages",
                                link: "/ws/binary/request-msg",
                                component: Link,
                                componentProp: "to",
                                active: location.pathname === "/ws/binary/request-msg"
                            }
                        ]
                    }

                ]
            },

            {
                label: "Rich Text Editor",
                link: "rich-text-editor",
                component: Link,
                componentProp: "to",
                active: location.pathname === "/rich-text-editor",
            },
        ];
    }, [location.pathname]);

    return (
        <>
            <LeftSideBar isDesktop={isDesktop} menuItems={menuItems} />
            <AppBodyContent appHaveOwnLeftSideBar={true}>
                <Routes>
                    <Route path="/misc-demo" element={<MiscPage />} />
                    <Route path="/ws/chat" element={<ChatPage />} />
                    <Route path="/ws/async-msg" element={<AsyncMessagingPage />} />
                    <Route path="/ws/binary/request-msg" element={<BinaryMessagingPage />} />
                    <Route path="/rich-text-editor" element={<RichEditPage />} />
                    <Route path="*" element={<Navigate to={"/"} />} />
                </Routes>
            </AppBodyContent>
        </>
    );
};
