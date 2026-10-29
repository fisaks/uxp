import CloseIcon from "@mui/icons-material/Close";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { Button, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { formatDuration } from "../library/libraryFormat";
import { selectPlayerState } from "./playerSlice";
import { usePlayerCommand } from "./usePlayerCommand";

const ICON_WIDTH = 32;

/** The tracks that will be played, in the order they were added. The one that is playing is marked. */
const QueuePage: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const send = usePlayerCommand();

    if (!state || state.queue.length === 0) {
        return <Typography color="text.secondary">The queue is empty. Play something from the Library.</Typography>;
    }

    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">Queue, {state.queue.length} tracks</Typography>
                <Button onClick={() => send("player_clear", {})}>Clear</Button>
            </Stack>
            <List disablePadding>
                {state.queue.map((track, index) => {
                    const current = index === state.currentIndex;
                    return (
                        <ListItem
                            key={`${track.id}-${index}`}
                            disablePadding
                            divider
                            secondaryAction={
                                <IconButton edge="end" onClick={() => send("player_remove", { index })} aria-label="Remove from the queue">
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            }
                        >
                            <ListItemButton selected={current} onClick={() => send("player_play_index", { index })} sx={{ pr: 7 }}>
                                <ListItemIcon sx={{ minWidth: ICON_WIDTH }}>
                                    {current && state.status === "playing" ? <GraphicEqIcon color="primary" fontSize="small" /> : null}
                                </ListItemIcon>
                                <ListItemText
                                    primary={track.title}
                                    secondary={[track.artist, track.durationSec ? formatDuration(track.durationSec) : undefined]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    slotProps={{ primary: { sx: { fontWeight: current ? 600 : undefined, overflowWrap: "anywhere" } } }}
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </>
    );
};

export default QueuePage;
