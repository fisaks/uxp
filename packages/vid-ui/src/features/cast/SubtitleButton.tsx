import ClosedCaptionIcon from "@mui/icons-material/ClosedCaption";
import { Menu, MenuItem } from "@mui/material";
import { MovieSubtitle } from "@vid/common";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";

type SubtitleButtonProps = {
    subtitles: MovieSubtitle[];
    /** The index of the subtitle that shows, null for none. */
    selected: number | null;
    onChange: (index: number | null) => void;
};

/** An icon button with a menu of the subtitles of a film and "Off". The icon is the same for all, the tooltip says which shows. */
export const SubtitleButton: React.FC<SubtitleButtonProps> = ({ subtitles, selected, onChange }) => {
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const current = subtitles.find(({ index }) => index === selected);
    const choose = (index: number | null) => {
        setAnchor(null);
        onChange(index);
    };
    return (
        <>
            <TooltipIconButton
                size="small"
                tooltip={`Subtitles: ${current?.label ?? "off"}`}
                tooltipPortal={portalContainer}
                color={current ? "primary" : "default"}
                onClick={(e) => setAnchor(e.currentTarget)}
            >
                <ClosedCaptionIcon />
            </TooltipIconButton>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={() => portalContainer.current}>
                <MenuItem selected={!current} onClick={() => choose(null)}>
                    Off
                </MenuItem>
                {subtitles.map(({ index, label }) => (
                    <MenuItem key={index} selected={index === selected} onClick={() => choose(index)}>
                        {label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
