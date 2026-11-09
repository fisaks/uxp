import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import CheckIcon from "@mui/icons-material/Check";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import React, { useEffect, useRef, useState } from "react";
import { useBrowserPlayer } from "../browser-player/useBrowserPlayer";
import { useCast } from "./useCast";

const DONE_SHOW_MS = 1000;

/** Plays the clips one after the other in the player tab or on a Chromecast, the one it is pressed for replacing what plays there. */
export const PlayAllButton: React.FC<{ clipIds: string[]; label?: string }> = ({ clipIds, label = "Play all" }) => {
    const portalContainer = usePortalContainerRef();
    const { state, editQueue } = useCast();
    const { send: sendToPlayerTab } = useBrowserPlayer();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    // The device that was started, shown in the menu for a moment before it closes.
    const [startedOn, setStartedOn] = useState<string>();
    const timer = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => clearTimeout(timer.current), []);
    if (clipIds.length === 0) return null;

    const playInTab = () => {
        sendToPlayerTab({ action: "replace", clipIds });
        setAnchor(null);
    };

    const playOn = async (deviceId: string) => {
        if (!(await editQueue(deviceId, { action: "replace", clipIds }))) return setAnchor(null);
        setStartedOn(deviceId);
        timer.current = setTimeout(() => {
            setStartedOn(undefined);
            setAnchor(null);
        }, DONE_SHOW_MS);
    };

    return (
        <>
            <Button size="small" startIcon={<PlaylistPlayIcon />} onClick={(e) => setAnchor(e.currentTarget)}>
                {label}
            </Button>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={() => portalContainer.current}>
                <MenuItem onClick={playInTab} sx={startedOn === undefined ? undefined : { pointerEvents: "none" }}>
                    <ListItemIcon>
                        <OpenInBrowserIcon />
                    </ListItemIcon>
                    <ListItemText secondary="A tab of this browser">Player tab</ListItemText>
                </MenuItem>
                {state?.devices.map((device) => (
                    <MenuItem
                        key={device.id}
                        onClick={() => playOn(device.id)}
                        sx={startedOn === undefined ? undefined : { pointerEvents: "none" }}
                    >
                        <ListItemIcon>{startedOn === device.id && <CheckIcon color="primary" />}</ListItemIcon>
                        <ListItemText secondary={startedOn === device.id ? "Playing" : device.model}>{device.name}</ListItemText>
                    </MenuItem>
                ))}
                {state?.devices.length === 0 && (
                    <MenuItem disabled>
                        <ListItemText>No Chromecast found</ListItemText>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
};
