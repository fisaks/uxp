import { Button, Menu, MenuItem } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";

type RateButtonProps = {
    rate: number;
    rates: number[];
    onChange: (rate: number) => void;
};

/** Shows the playback speed, e.g. `1.5x`, and a menu with the given speeds. */
export const RateButton: React.FC<RateButtonProps> = ({ rate, rates, onChange }) => {
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
        <>
            <Button size="small" aria-label="Playback speed" sx={{ minWidth: 0, px: 1 }} onClick={(e) => setAnchor(e.currentTarget)}>
                {rate}x
            </Button>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={() => portalContainer.current}>
                {rates.map((option) => (
                    <MenuItem
                        key={option}
                        selected={option === rate}
                        onClick={() => {
                            setAnchor(null);
                            onChange(option);
                        }}
                    >
                        {option}x
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
