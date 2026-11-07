import CastIcon from "@mui/icons-material/Cast";
import CastConnectedIcon from "@mui/icons-material/CastConnected";
import CheckIcon from "@mui/icons-material/Check";
import ComputerIcon from "@mui/icons-material/Computer";
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, IconButton } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";
import { useCast } from "./CastProvider";

type CastPickerProps = {
    clipId: string;
    /** Where the browser is in the clip, for the handover to a Chromecast. */
    getPosition: () => number;
    /** Takes the clip over from the cast at that position. The cast is stopped by the picker. */
    onHandBack: (positionSec: number) => void;
    /** The browser stops playing when a Chromecast takes over. */
    onCasting: () => void;
};

/**
 * The choice of where the clip plays: this browser or a Chromecast. A click on a Chromecast starts the clip there from the
 * place the browser has reached, and the menu stays open so the clip can go to several. "This browser" takes the clip back.
 */
export const CastPicker: React.FC<CastPickerProps> = ({ clipId, getPosition, onHandBack, onCasting }) => {
    const portalContainer = usePortalContainerRef();
    const { state, start, stop } = useCast();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    if (!state?.configured || state.devices.length === 0) return null;

    const onThisClip = state.sessions.filter((s) => s.clipId === clipId);
    const casting = onThisClip.length > 0;

    const castTo = async (deviceId: string) => {
        if (onThisClip.some((s) => s.deviceId === deviceId)) {
            await stop(deviceId);
            return;
        }
        const position = onThisClip[0] ? undefined : getPosition();
        if (await start(clipId, [deviceId], position)) onCasting();
    };

    const takeBack = async () => {
        const position = onThisClip[0]?.positionSec ?? 0;
        await Promise.all(onThisClip.map((s) => stop(s.deviceId)));
        onHandBack(position);
        setAnchor(null);
    };

    return (
        <>
            <Tooltip title={casting ? "Casting this clip" : "Play on a Chromecast"} PopperProps={{ container: () => portalContainer.current }}>
                <IconButton color={casting ? "primary" : "default"} onClick={(e) => setAnchor(e.currentTarget)} aria-label="Play on a Chromecast">
                    {casting ? <CastConnectedIcon /> : <CastIcon />}
                </IconButton>
            </Tooltip>
            <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)} container={() => portalContainer.current}>
                <MenuItem onClick={takeBack} disabled={!casting}>
                    <ListItemIcon>
                        <ComputerIcon />
                    </ListItemIcon>
                    <ListItemText>This browser</ListItemText>
                </MenuItem>
                <Divider />
                {state.devices.map((device) => (
                    <MenuItem key={device.id} onClick={() => castTo(device.id)}>
                        <ListItemIcon>{onThisClip.some((s) => s.deviceId === device.id) && <CheckIcon color="primary" />}</ListItemIcon>
                        <ListItemText secondary={device.model}>{device.name}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};
