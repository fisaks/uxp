import { Drawer, List, Toolbar } from "@mui/material";
import React, { RefObject, useState } from "react";
import { SidebarMenu } from "./SidebarMenu";

export type SidebarMenuItems = {
    label: string;
    link: string|null;
    active?: boolean;
    component?: React.ElementType; // Custom component to render
    componentProp?: string; // Props to pass to the custom component
    children?: SidebarMenuItems[];
};

type SidebarProps = {
    isDesktop: boolean;
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    sidebarMenuItems: SidebarMenuItems[];
    drawerRootRef?: RefObject<HTMLDivElement>;
};

export const Sidebar: React.FC<SidebarProps> = ({ isDesktop, sidebarOpen, toggleSidebar, sidebarMenuItems, drawerRootRef }) => {
    const container = drawerRootRef ? drawerRootRef.current : undefined;
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

    const handleToggleSubmenu = (label: string) => (event: React.MouseEvent) => {
        event.stopPropagation();
        event.preventDefault();
        setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] })); // Toggle the menu state
    };
    return (
        <Drawer
            variant={isDesktop ? "permanent" : "temporary"}
            container={container}
            open={isDesktop || sidebarOpen}
            onClose={toggleSidebar}
            ModalProps={{ keepMounted: true }}
            sx={{
                [`& .MuiDrawer-paper`]: {
                    width: "15rem",
                    boxSizing: "border-box",
                    ...(isDesktop
                        ? {}
                        : {
                            position: "fixed",
                            top: 0,
                            left: 0,
                            height: "100%",
                            zIndex: (theme) => theme.zIndex.drawer + 1,
                        }),
                },
            }}
        >
            <Toolbar />
            <List>
                <SidebarMenu items={sidebarMenuItems} openMenus={openMenus} onToggleSubmenu={handleToggleSubmenu} toggleSidebar={toggleSidebar} />
            </List>
        </Drawer>
    );
};
