import CastIcon from "@mui/icons-material/Cast";
import CastConnectedIcon from "@mui/icons-material/CastConnected";
import CheckIcon from "@mui/icons-material/Check";
import ComputerIcon from "@mui/icons-material/Computer";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CircularProgress, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, IconButton } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useRef, useState } from "react";
import { useCast } from "./useCast";

const SEARCH_SHOW_MS = 4000;
const DONE_SHOW_MS = 1000;

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
    const { state, start, stop, refresh, editQueue } = useCast();
    // The device that plays another clip and is asked what to do with this one.
    const [choosing, setChoosing] = useState<string>();
    // What the last choice did, shown in the menu for a moment before it closes.
    const [done, setDone] = useState<{ deviceId: string; text: string }>();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();
    const doneTimer = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => [searchTimer, doneTimer].forEach((t) => clearTimeout(t.current)), []);
    // The icon stays when no Chromecast is found, so the search can be started again from the menu.
    if (!state?.configured) return null;

    // The devices answer by themselves a moment later, so the item only shows that it is looking.
    const search = async () => {
        setSearching(true);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setSearching(false), SEARCH_SHOW_MS);
        await refresh();
    };

    const onThisClip = state.sessions.filter((s) => s.clipId === clipId);
    const casting = onThisClip.length > 0;

    const castTo = async (deviceId: string) => {
        if (onThisClip.some((s) => s.deviceId === deviceId)) {
            await stop(deviceId);
            return;
        }
        if (state.sessions.some((s) => s.deviceId === deviceId)) {
            setChoosing(choosing === deviceId ? undefined : deviceId);
            return;
        }
        const position = onThisClip[0] ? undefined : getPosition();
        if (await start(clipId, [deviceId], position)) onCasting();
    };

    const playNow = async (deviceId: string) => {
        setChoosing(undefined);
        if (await start(clipId, [deviceId], onThisClip[0] ? undefined : getPosition())) onCasting();
    };

    const queueClip = async (deviceId: string, action: "next" | "append") => {
        if (!(await editQueue(deviceId, { action, clipIds: [clipId] }))) return setChoosing(undefined);
        setDone({ deviceId, text: action === "next" ? "Plays next" : "Added to the queue" });
        doneTimer.current = setTimeout(() => {
            setDone(undefined);
            setChoosing(undefined);
            setAnchor(null);
        }, DONE_SHOW_MS);
    };

    const takeBack = async () => {
        const position = onThisClip[0]?.positionSec ?? 0;
        await Promise.all(onThisClip.map((s) => stop(s.deviceId)));
        onHandBack(position);
        setAnchor(null);
    };

    return (
        <>
            <Tooltip
                title={casting ? "Casting this clip" : "Play on a Chromecast"}
                slotProps={{ popper: { container: portalContainer.current } }}
            >
                <IconButton
                    color={casting ? "primary" : "default"}
                    onClick={(e) => setAnchor(e.currentTarget)}
                    aria-label="Play on a Chromecast"
                >
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
                {state.devices.flatMap((device) => [
                    <MenuItem key={device.id} onClick={() => castTo(device.id)}>
                        <ListItemIcon>{onThisClip.some((s) => s.deviceId === device.id) && <CheckIcon color="primary" />}</ListItemIcon>
                        <ListItemText secondary={device.model}>{device.name}</ListItemText>
                    </MenuItem>,
                    ...(done?.deviceId === device.id
                        ? [
                              <MenuItem key={`${device.id}-done`} sx={{ pl: 7, pointerEvents: "none" }}>
                                  <ListItemIcon>
                                      <CheckIcon color="primary" />
                                  </ListItemIcon>
                                  <ListItemText>{done.text}</ListItemText>
                              </MenuItem>,
                          ]
                        : choosing === device.id
                          ? [
                                <MenuItem key={`${device.id}-now`} sx={{ pl: 7 }} onClick={() => playNow(device.id)}>
                                    <ListItemText>Play now</ListItemText>
                                </MenuItem>,
                                <MenuItem key={`${device.id}-next`} sx={{ pl: 7 }} onClick={() => queueClip(device.id, "next")}>
                                    <ListItemText>Play next</ListItemText>
                                </MenuItem>,
                                <MenuItem key={`${device.id}-add`} sx={{ pl: 7 }} onClick={() => queueClip(device.id, "append")}>
                                    <ListItemText>Add to queue</ListItemText>
                                </MenuItem>,
                            ]
                          : []),
                ])}
                {state.devices.length === 0 && (
                    <MenuItem disabled>
                        <ListItemText>No Chromecast found</ListItemText>
                    </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={search} disabled={searching}>
                    <ListItemIcon>{searching ? <CircularProgress size={20} /> : <RefreshIcon color="primary" />}</ListItemIcon>
                    <ListItemText>{searching ? "Looking..." : "Refresh"}</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
};
