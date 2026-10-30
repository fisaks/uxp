import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppDispatch } from "../../hooks";
import { AddToPlaylistDialog } from "../playlist/AddToPlaylistDialog";
import { playerCommandFailed } from "../player/playerSlice";
import { requestAnswered } from "../shared/requestCacheSlice";
import { requestKey } from "../shared/requestKey";
import { useRequest } from "../shared/useRequest";
import { PlayedList } from "./PlayedList";
import { PreviousQueueList } from "./PreviousQueueList";

/** What was played and the queues that were replaced, to play again. */
const HistoryPage: React.FC = () => {
    const portalContainer = usePortalContainerRef();
    const dispatch = useAppDispatch();
    const { sendMessageAsync } = useAudioWebSocket();
    const { data, error } = useRequest("history_get", {});
    const [saving, setSaving] = useState<string[] | undefined>(undefined);
    const [clearing, setClearing] = useState(false);

    const clear = async () => {
        setClearing(false);
        try {
            const response = await sendMessageAsync("history_clear", {});
            dispatch(requestAnswered({ key: requestKey("history_get", {}), data: response.payload }));
        } catch {
            dispatch(playerCommandFailed("The history could not be cleared."));
        }
    };

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    const empty = data.plays.length === 0 && data.queues.length === 0;

    return (
        <>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="h6">History</Typography>
                <Button color="error" disabled={empty} onClick={() => setClearing(true)}>
                    Clear
                </Button>
            </Stack>
            {empty && (
                <Typography color="text.secondary">
                    Nothing has been played yet. A track is in the history when it has been listened to for 30 seconds.
                </Typography>
            )}
            {data.queues.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Previous queues
                    </Typography>
                    <PreviousQueueList queues={data.queues} onSaveAsPlaylist={setSaving} />
                </Box>
            )}
            {data.plays.length > 0 && (
                <>
                    <Typography variant="subtitle2" color="text.secondary">
                        Played
                    </Typography>
                    <PlayedList plays={data.plays} />
                    {data.playCount > data.plays.length && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                            The latest {data.plays.length} of {data.playCount} are shown.
                        </Typography>
                    )}
                </>
            )}
            <AddToPlaylistDialog trackIds={saving} title="Save the queue as a playlist" onClose={() => setSaving(undefined)} />
            <Dialog open={clearing} onClose={() => setClearing(false)} container={portalContainer.current}>
                <DialogTitle>Clear the history</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Forget what was played and the previous queues? Playlists and the queue are not touched.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearing(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={clear}>
                        Clear
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default HistoryPage;
