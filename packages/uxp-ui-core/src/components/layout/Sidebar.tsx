import { Drawer, List, ListItem, ListItemText, Toolbar } from "@mui/material";
import React from "react";

interface SidebarProps {
    isDesktop: boolean;
    sidebarOpen: boolean;
    toggleSidebar: () => void;
    sidebarMenuItems: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ isDesktop, sidebarOpen, toggleSidebar, sidebarMenuItems }) => {
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
                },
            }}
        >
            <Toolbar />
            <List>
                {sidebarMenuItems.map((text) => (
                    <ListItem
                        key={text}
                        component="a"
                        href={`#${text.toLowerCase()}`}
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
                        }}
                    >
                        <ListItemText primary={text} />
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
