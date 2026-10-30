import CloseIcon from "@mui/icons-material/Close";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { QueueTrack } from "@aud/common";
import React, { useMemo, useState } from "react";
import { useAppSelector } from "../../hooks";
import { formatDuration } from "../library/libraryFormat";
import { AddToPlaylistDialog } from "../playlist/AddToPlaylistDialog";
import { SortableList, uniqueKeys } from "../shared/SortableList";
import { partNames } from "../audiobook/partNames";
import { selectIsBookQueue, selectPlayerState } from "./playerSelectors";
import { usePlayerActions } from "./usePlayerActions";
import { usePlayerCommand } from "./usePlayerCommand";

type QueueRow = { track: QueueTrack; key: string };

/** The parts of the audiobook that is the queue. They are only played: they stay as they are, with no handles, no remove and no playlist. */
const BookQueue: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const send = usePlayerCommand();
    const { clear } = usePlayerActions();
    if (!state) return null;
    const names = partNames(state.queue);
    const [first] = state.queue;
    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                        {first.albumTitle}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {first.artist}
                    </Typography>
                </Box>
                <Button onClick={clear}>Clear</Button>
            </Stack>
            {state.queue.map((part, index) => {
                const current = index === state.currentIndex;
                return (
                    <Box
                        key={part.id}
                        onClick={() => send("player_play_index", { index })}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            borderBottom: 1,
                            borderColor: "divider",
                            bgcolor: current ? "action.selected" : undefined,
                            cursor: "pointer",
                            py: 1,
                            pl: 1,
                        }}
                    >
                        <Box sx={{ width: 28, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                            {current && state.status === "playing" ? <GraphicEqIcon color="primary" fontSize="small" /> : null}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: current ? 600 : undefined }}>{names[index]}</Typography>
                            {part.durationSec ? (
                                <Typography variant="body2" color="text.secondary">
                                    {formatDuration(part.durationSec)}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>
                );
            })}
        </>
    );
};

/** The tracks that will be played, in the order they were added, which can be changed by dragging. The one that is playing is marked. */
const QueuePage: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const send = usePlayerCommand();
    const { clear } = usePlayerActions();
    const isBook = useAppSelector(selectIsBookQueue);
    const [saving, setSaving] = useState<string[] | undefined>(undefined);

    const rows = useMemo<QueueRow[]>(() => {
        const queue = state?.queue ?? [];
        const keys = uniqueKeys(queue.map((track) => track.id));
        return queue.map((track, index) => ({ track, key: keys[index] }));
    }, [state?.queue]);

    if (!state || state.queue.length === 0) {
        return <Typography color="text.secondary">The queue is empty. Play something from the Library.</Typography>;
    }

    if (isBook) {
        return <BookQueue />;
    }

    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">Queue, {state.queue.length} tracks</Typography>
                <Stack direction="row">
                    <Button startIcon={<LibraryAddIcon />} onClick={() => setSaving(state.queue.map((track) => track.id))}>
                        Save as playlist
                    </Button>
                    <Button onClick={clear}>Clear</Button>
                </Stack>
            </Stack>
            <SortableList
                items={rows}
                getKey={(row) => row.key}
                onMove={(from, to) => send("player_move", { from, to })}
                renderItem={({ track }, _displayIndex, handle) => {
                    // The place in the queue is where the track is for the server: after a drag the list shows it before the server has answered.
                    const index = state.queue.indexOf(track);
                    const current = index === state.currentIndex;
                    return (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                borderBottom: 1,
                                borderColor: "divider",
                                bgcolor: current ? "action.selected" : undefined,
                            }}
                        >
                            {handle}
                            <Box sx={{ width: 28, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                                {current && state.status === "playing" ? <GraphicEqIcon color="primary" fontSize="small" /> : null}
                            </Box>
                            <Box
                                onClick={() => send("player_play_index", { index })}
                                sx={{ flex: 1, minWidth: 0, py: 1, cursor: "pointer" }}
                            >
                                <Typography sx={{ overflowWrap: "anywhere", fontWeight: current ? 600 : undefined }}>
                                    {track.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {[track.artist, track.durationSec ? formatDuration(track.durationSec) : undefined]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </Typography>
                            </Box>
                            <IconButton size="small" aria-label="Remove from the queue" onClick={() => send("player_remove", { index })}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    );
                }}
            />
            <AddToPlaylistDialog trackIds={saving} title="Save the queue as a playlist" onClose={() => setSaving(undefined)} />
        </>
    );
};

export default QueuePage;
