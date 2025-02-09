import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { ListItemIcon, ListItemText, Menu, MenuItem, ModalProps, Tooltip, TooltipProps } from "@mui/material";
import React, { useState } from "react";


export type MenuItemType = {
    label?: string;
    icon?: React.ReactNode;
    tooltip?: string;
    disabled?: boolean;
    onClick?: () => void;
    children?: MenuItemType[];

};

export const RecursiveMenuItem: React.FC<{
    slotProps: TooltipProps["slotProps"],
    item: MenuItemType; container?: ModalProps['container'],
    onClose: () => void
}> = ({ item, container, slotProps ,onClose}) => {
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
            item.onClick();
            onClose();
        }
        
    };


    return (
        <div style={{ pointerEvents: 'auto' }}>
            <Tooltip title={item.tooltip || ""} arrow placement="right" slotProps={slotProps}>
                <MenuItem
                    disabled={item.disabled}
                    onClick={handleClick}
                    onMouseEnter={!item.disabled && item.children ? handleSubmenuOpen : undefined}
                    onMouseLeave={!item.disabled && item.children ? handleSubmenuClose : undefined}

                >
                    {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                    {item.label && <ListItemText primary={item.label} />}
                    {item.children && <ChevronRightIcon />}
                    {item.children && (
                        <Menu
                            container={container}
                            anchorEl={submenuAnchorEl}
                            open={Boolean(submenuAnchorEl)}
                            onClose={handleSubmenuClose}
                            style={{ pointerEvents: 'none' }}
                            MenuListProps={{
                                onMouseLeave: handleSubmenuClose,

                            }}
                            anchorOrigin={{ vertical: "top", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "left" }}
                        >
                            {item.children.map((subItem, subIndex) => (
                                <RecursiveMenuItem key={subIndex} item={subItem} container={container} slotProps={slotProps} onClose={onClose}/>
                            ))}
                        </Menu>
                    )}
                </MenuItem>

            </Tooltip>
        </div>
    );
};