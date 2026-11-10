import CastIcon from "@mui/icons-material/Cast";
import CastConnectedIcon from "@mui/icons-material/CastConnected";
import CheckIcon from "@mui/icons-material/Check";
import ComputerIcon from "@mui/icons-material/Computer";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import RefreshIcon from "@mui/icons-material/Refresh";
import { CircularProgress, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, IconButton } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useRef, useState } from "react";
import { useGetCastGroupsQuery } from "../cast-group/castGroup.api";
import { PLAYER_TAB_ID } from "../browser-player/browserPlayerLink";
import { useBrowserPlayer } from "../browser-player/useBrowserPlayer";
import { groupMembersText } from "./castText";
import { useCast } from "./useCast";

const SEARCH_SHOW_MS = 4000;
const DONE_SHOW_MS = 1000;
const PLAYER_TAB = PLAYER_TAB_ID;

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
    const { state, start, startGroup, stop, refresh, editQueue } = useCast();
    const { data: groups = [] } = useGetCastGroupsQuery();
    const { player: playerTab, send: sendToPlayerTab } = useBrowserPlayer();
    // The device that plays another clip and is asked what to do with this one.
    const [choosing, setChoosing] = useState<string>();
    // What the last choice did, shown in the menu for a moment before it closes.
    const [done, setDone] = useState<{ deviceId: string; text: string }>();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [searching, setSearching] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout>>();
    const doneTimer = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => [searchTimer, doneTimer].forEach((t) => clearTimeout(t.current)), []);

    // The devices answer by themselves a moment later, so the item only shows that it is looking.
    const search = async () => {
        setSearching(true);
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setSearching(false), SEARCH_SHOW_MS);
        await refresh();
    };

    const devices = state?.devices ?? [];
    // The player tab has its own entry, and is not a Chromecast to stop or to take the clip back from.
    const sessions = (state?.sessions ?? []).filter((s) => s.deviceId !== PLAYER_TAB);
    const onThisClip = sessions.filter((s) => s.clipId === clipId);
    const casting = onThisClip.length > 0;
    const position = () => (onThisClip[0] ? undefined : getPosition());
    // The places to play: the player tab, and the Chromecasts. A place that plays something is asked what to do with the clip.
    const targets = [
        {
            id: PLAYER_TAB,
            name: "Player tab",
            secondary: "A tab of this browser",
            active: playerTab?.clipIds[playerTab.index] === clipId,
            busy: playerTab !== undefined,
        },
        ...groups.map((group) => ({
            id: group.id,
            name: group.name,
            secondary: groupMembersText(group),
            active: onThisClip.some((s) => s.deviceId === group.id),
            busy: sessions.some((s) => s.deviceId === group.id),
        })),
        ...devices.map((device) => ({
            id: device.id,
            name: device.name,
            secondary: device.model,
            active: onThisClip.some((s) => s.deviceId === device.id),
            busy: sessions.some((s) => s.deviceId === device.id),
        })),
    ];

    // A group starts the clip on all its Chromecasts, which then play in sync.
    // A group with the player tab asks for the tab first, from the click, which then plays along with the group.
    const startOn = (id: string) => {
        const group = groups.find((g) => g.id === id);
        if (!group) return start(clipId, [id], position());
        if (group.browser) sendToPlayerTab({ action: "replace", clipIds: [clipId], positionSec: position(), follow: id });
        return startGroup(id, clipId, position());
    };

    // The tab opens from the click, so the first thing these do is ask for it, before anything is waited for.
    const castTo = async (target: (typeof targets)[number]) => {
        if (target.active && target.id !== PLAYER_TAB) {
            await stop(target.id);
            return;
        }
        if (target.busy) {
            setChoosing(choosing === target.id ? undefined : target.id);
            return;
        }
        if (target.id === PLAYER_TAB) {
            sendToPlayerTab({ action: "replace", clipIds: [clipId], positionSec: getPosition() });
            onCasting();
            setAnchor(null);
        } else if (await startOn(target.id)) onCasting();
    };

    const playNow = async (id: string) => {
        setChoosing(undefined);
        if (id === PLAYER_TAB) {
            sendToPlayerTab({ action: "replace", clipIds: [clipId], positionSec: getPosition() });
            onCasting();
            setAnchor(null);
        } else if (await startOn(id)) onCasting();
    };

    const queueClip = async (id: string, action: "next" | "append") => {
        if (id === PLAYER_TAB) sendToPlayerTab({ action, clipIds: [clipId] });
        else if (!(await editQueue(id, { action, clipIds: [clipId] }))) return setChoosing(undefined);
        setDone({ deviceId: id, text: action === "next" ? "Plays next" : "Added to the queue" });
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
                {targets.flatMap((target) => [
                    <MenuItem key={target.id} onClick={() => castTo(target)}>
                        <ListItemIcon>
                            {target.id === PLAYER_TAB ? (
                                <OpenInBrowserIcon color={target.active ? "primary" : "inherit"} />
                            ) : (
                                target.active && <CheckIcon color="primary" />
                            )}
                        </ListItemIcon>
                        <ListItemText secondary={target.secondary}>{target.name}</ListItemText>
                    </MenuItem>,
                    ...(done?.deviceId === target.id
                        ? [
                              <MenuItem key={`${target.id}-done`} sx={{ pl: 7, pointerEvents: "none" }}>
                                  <ListItemIcon>
                                      <CheckIcon color="primary" />
                                  </ListItemIcon>
                                  <ListItemText>{done.text}</ListItemText>
                              </MenuItem>,
                          ]
                        : choosing === target.id
                          ? [
                                <MenuItem key={`${target.id}-now`} sx={{ pl: 7 }} onClick={() => playNow(target.id)}>
                                    <ListItemText>Play now</ListItemText>
                                </MenuItem>,
                                <MenuItem key={`${target.id}-next`} sx={{ pl: 7 }} onClick={() => queueClip(target.id, "next")}>
                                    <ListItemText>Play next</ListItemText>
                                </MenuItem>,
                                <MenuItem key={`${target.id}-add`} sx={{ pl: 7 }} onClick={() => queueClip(target.id, "append")}>
                                    <ListItemText>Add to queue</ListItemText>
                                </MenuItem>,
                            ]
                          : []),
                ])}
                {devices.length === 0 && (
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
