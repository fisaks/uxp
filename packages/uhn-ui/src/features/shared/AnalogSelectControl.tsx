import { MenuItem, Select } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { AnalogOutputOption } from "@uhn/blueprint";
import React, { useCallback, useState } from "react";

type AnalogSelectControlProps = {
    options: AnalogOutputOption[];
    value: number;
    onChange: (value: number) => void;
    iconColor: string;
    disabled?: boolean;
};

/** Dropdown select for analog outputs with discrete named options (e.g. Mi-Light effect modes).
 *  Replaces the slider in all analog rendering paths (tile inline, resource popover,
 *  sub-resource row, view command header) when the resource or view command has `options`.
 *  Uses controlled open state so clicking the already-selected item re-sends the command. */
export const AnalogSelectControl: React.FC<AnalogSelectControlProps> = ({
    options, value, onChange, iconColor, disabled,
}) => {
    const portalContainer = usePortalContainerRef();
    const [open, setOpen] = useState(false);

    const handleOpen = useCallback(() => setOpen(true), []);
    const handleClose = useCallback(() => setOpen(false), []);

    const handleItemClick = useCallback((optValue: number) => {
        onChange(optValue);
        setOpen(false);
    }, [onChange]);

    return (
        <Select<number>
            value={value}
            open={open}
            onOpen={handleOpen}
            onClose={handleClose}
            size="small"
            disabled={disabled}
            MenuProps={{ container: portalContainer.current }}
            sx={{
                minWidth: 120,
                "& .MuiSelect-select": {
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: iconColor,
                    py: 0.5,
                },
            }}
        >
            {options.map(opt => (
                <MenuItem
                    key={opt.value}
                    value={opt.value}
                    onClick={() => handleItemClick(opt.value)}
                >
                    {opt.label}
                </MenuItem>
            ))}
        </Select>
    );
};
