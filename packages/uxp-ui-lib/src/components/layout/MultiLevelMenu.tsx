import { Button, IconButton, Menu, ModalProps, Tooltip } from "@mui/material";
import React, { MouseEventHandler, useMemo, useState } from "react";
import { MenuItemType, RecursiveMenuItem } from "./RecursiveMenuItem";

interface MultiLevelMenuProps<T = void> {
    menuItems: MenuItemType<T>[];
    itemData?: T;
    triggerLabel?: string;
    triggerIcon?: React.ReactNode;
    tooltipText?: string;
    container?: ModalProps["container"];
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined;

}

const MultiLevelMenu = <T,>({
    menuItems,
    triggerLabel,
    triggerIcon,
    tooltipText,
    container,
    onClick,
    itemData,
}: MultiLevelMenuProps<T>) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const slotProps = useMemo(() => ({ popper: { container } }), [container]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
        event.stopPropagation();
        onClick?.(event);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);

    };

    return (
        <div>
            <Tooltip title={tooltipText || ""} arrow slotProps={slotProps}>
                <span>
                    {" "}
                    {/* Ensures tooltip works for disabled elements */}
                    {triggerIcon ? <IconButton onClick={handleMenuOpen}>{triggerIcon}</IconButton> : null}
                    {triggerLabel ? <Button onClick={handleMenuOpen}>{triggerLabel}</Button> : null}
                </span>
            </Tooltip>

            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} container={container}>
                {menuItems.map((item, index) => (
                    <RecursiveMenuItem key={index} item={item} container={container} slotProps={slotProps} onClose={handleMenuClose} itemData={itemData} />
                ))}
            </Menu>
        </div>
    );
};

export default MultiLevelMenu;
