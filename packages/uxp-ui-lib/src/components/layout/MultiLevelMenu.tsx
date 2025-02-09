import { Button, IconButton, Menu, ModalProps, Tooltip } from "@mui/material";
import React, { useMemo, useState } from "react";
import { MenuItemType, RecursiveMenuItem } from "./RecursiveMenuItem";

interface MultiLevelMenuProps {
    menuItems: MenuItemType[];
    triggerLabel?: string;
    triggerIcon?: React.ReactNode;
    tooltipText?: string;
    container?: ModalProps["container"];
}

const MultiLevelMenu: React.FC<MultiLevelMenuProps> = ({ menuItems, triggerLabel, triggerIcon, tooltipText, container }) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const slotProps = useMemo(() => ({ popper: { container } }), [container]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
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
                    <RecursiveMenuItem key={index} item={item} container={container} slotProps={slotProps} onClose={handleMenuClose} />
                ))}
            </Menu>
        </div>
    );
};

export default MultiLevelMenu;
