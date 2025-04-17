import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { ListItemIcon, ListItemText, Menu, MenuItem, ModalProps, Tooltip, TooltipProps } from "@mui/material";
import React, { useState } from "react";

export type MenuItemType<T = void> = {
    label?: string | (() => string);
    icon?: React.ReactNode | (() => React.ReactNode);
    tooltip?: string;
    disabled?: boolean;
    onClick?: (data?: T) => void;

    children?: MenuItemType<T>[];
};
type RecursiveMenuItemProps<T = void> = {
    slotProps: TooltipProps["slotProps"];
    itemData?: T;
    item: MenuItemType<T>;
    container?: ModalProps["container"];
    onClose: () => void;
};
export const RecursiveMenuItem: <T>(props: RecursiveMenuItemProps<T>) => React.ReactElement | null = ({
    item,
    container,
    slotProps,
    itemData,
    onClose,
}) => {

    const [submenuAnchorEl, setSubmenuAnchorEl] = useState<null | HTMLElement>(null);

    const handleSubmenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setSubmenuAnchorEl(event.currentTarget);
    };

    const handleSubmenuClose = () => {
        setTimeout(() => {
            setSubmenuAnchorEl(null);
        }, 150);
    };
    const handleClick = () => {
        if (!item.disabled && item.onClick) {
            item.onClick(itemData);
            onClose();
        }
    };

    return (
        <div style={{ pointerEvents: "auto" }}>
            <Tooltip title={item.tooltip || ""} arrow placement="right" slotProps={slotProps}>
                <MenuItem
                    disabled={item.disabled}
                    onClick={handleClick}
                    onMouseEnter={!item.disabled && item.children ? handleSubmenuOpen : undefined}
                    onMouseLeave={!item.disabled && item.children ? handleSubmenuClose : undefined}
                >
                    {item.icon && <ListItemIcon>{typeof item.icon === "function" ? item.icon() : item.icon}</ListItemIcon>}
                    {item.label && <ListItemText primary={typeof item.label === "function" ? item.label() : item.label} />}
                    {item.children && <ChevronRightIcon />}
                    {item.children && (
                        <Menu
                            container={container}
                            anchorEl={submenuAnchorEl}
                            open={Boolean(submenuAnchorEl)}
                            onClose={handleSubmenuClose}
                            style={{ pointerEvents: "none" }}
                            MenuListProps={{
                                onMouseLeave: handleSubmenuClose,
                            }}
                            anchorOrigin={{ vertical: "top", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "left" }}
                        >
                            {item.children.map((subItem, subIndex) => (
                                <RecursiveMenuItem
                                    key={subIndex}
                                    item={subItem}
                                    container={container}
                                    slotProps={slotProps}
                                    onClose={onClose}
                                />
                            ))}
                        </Menu>
                    )}
                </MenuItem>
            </Tooltip>
        </div>
    );
};
