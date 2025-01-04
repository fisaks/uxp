import { Drawer, List, ListItem, ListItemText, Toolbar } from "@mui/material";
import React from "react";

export type SidebarMenuItems = {
    label: string;
    link: string;
    active?: boolean;
    component?: React.ElementType; // Custom component to render
    componentProp: string; // Props to pass to the custom component
};

type SidebarProps = {
    isDesktop: boolean;
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    sidebarMenuItems: SidebarMenuItems[];
};

export const Sidebar: React.FC<SidebarProps> = ({ isDesktop, sidebarOpen, toggleSidebar, sidebarMenuItems }) => {
    return (
        <Drawer
            variant={isDesktop ? "permanent" : "temporary"}
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
                {sidebarMenuItems.map(({ label, link, component, componentProp, active }, index) => (
                    <ListItem
                        key={index}
                        component={component ?? "a"}
                        {...(component ? { [componentProp]: link } : { href: link })}
                        sx={{
                            cursor: "pointer",
                            "&:hover": {
                                bgcolor: "primary.light",
                                color: "white",
                            },
                            "&.Mui-focusVisible": {
                                bgcolor: "primary.main",
                                color: "white",
                            },
                            ...(active ? { bgcolor: "primary.main", color: "white" } : {}),
                        }}
                    >
                        <ListItemText primary={label} />
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};
