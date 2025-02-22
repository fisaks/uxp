import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Collapse, IconButton, List, ListItem, ListItemText } from "@mui/material";
import React from "react";
import { SidebarMenuItems } from "./Sidebar";


interface SidebarMenuProps {
    items: SidebarMenuItems[];
    openMenus: Record<string, boolean>;
    onToggleSubmenu: (label: string) => (event: React.MouseEvent) => void;
    toggleSidebar: () => void;
}

/**
 * Renders the sidebar menu recursively, supporting unlimited submenu levels.
 */
export const SidebarMenu: React.FC<SidebarMenuProps> = ({ items, openMenus, onToggleSubmenu, toggleSidebar }) => {
    return (
        <>
            {items.map(({ label, link, component, componentProp, active, children }, index) => {
                const hasChildren = !!children?.length;
                return (
                    <React.Fragment key={index}>
                        <ListItem
                            component={component ?? (link !== null ? "a" : "div")}
                            {...(component ? { [componentProp!]: link } : (link !== null ? { href: link } : {}))}
                            onClick={link !== null ? toggleSidebar : onToggleSubmenu(label)}
                            sx={{
                                cursor: "pointer",
                                "&:hover": { bgcolor: "primary.light", color: "white" },
                                "&.Mui-focusVisible": { bgcolor: "primary.main", color: "white" },
                                ...(active ? { bgcolor: "primary.main", color: "white" } : {}),
                            }}
                        >
                            <ListItemText primary={label} />
                            {hasChildren && (
                                <IconButton
                                    onClick={onToggleSubmenu(label)}
                                    size="small"
                                    sx={{ marginLeft: "auto" }}
                                >
                                    <ExpandMoreIcon
                                        sx={{
                                            transform: openMenus[label] ? "rotate(180deg)" : "rotate(0deg)",
                                            transition: "transform 0.2s",
                                        }}
                                    />
                                </IconButton>
                            )}
                        </ListItem>

                        {/* Render Submenu */}
                        {hasChildren && (
                            <Collapse in={openMenus[label]} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding sx={{ pl: 1 }}>
                                    <SidebarMenu items={children} openMenus={openMenus} onToggleSubmenu={onToggleSubmenu} toggleSidebar={toggleSidebar} />
                                </List>
                            </Collapse>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};
