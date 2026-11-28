import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { Button, Menu, MenuItem } from "@mui/material";
import { MovieAudioTrack } from "@vid/common";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";

type AudioButtonProps = {
    tracks: MovieAudioTrack[];
    /** The index of the track that plays. */
    selected: number;
    onChange: (index: number) => void;
    /** Only the icon, for a row of buttons that has little room. The menu still shows the tracks and which one plays. */
    compact?: boolean;
};

/** Shows the audio track that plays, e.g. `English`, and a menu with the tracks of the film. */
export const AudioButton: React.FC<AudioButtonProps> = ({ tracks, selected, onChange, compact }) => {
    const portalContainer = usePortalContainerRef();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    return (
        <>
            {compact ? (
                <TooltipIconButton
                    size="small"
                    tooltip={`Audio: ${tracks[selected]?.label}`}
                    tooltipPortal={portalContainer}
                    onClick={(e) => setAnchor(e.currentTarget)}
                >
                    <VolumeUpIcon />
                </TooltipIconButton>
            ) : (
                <Button
                    size="small"
                    aria-label="Audio track"
                    startIcon={<VolumeUpIcon />}
                    sx={{ px: 1 }}
                    onClick={(e) => setAnchor(e.currentTarget)}
                >
                    {tracks[selected]?.label}
                </Button>
            )}
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={() => portalContainer.current}>
                {tracks.map(({ index, label }) => (
                    <MenuItem
                        key={index}
                        selected={index === selected}
                        onClick={() => {
                            setAnchor(null);
                            onChange(index);
                        }}
                    >
                        {label}
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
