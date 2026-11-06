import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { GAIN_STEP_DB, MAX_GAIN_DB } from "@aud/common";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useState } from "react";
import { usePlayerCommand } from "../player/usePlayerCommand";

type AlbumGainDialogProps = {
    /** The tracks to set the gain of. The dialog is open while there are some. */
    trackIds: string[] | undefined;
    /** The gain they have now, when it is the same for all of them. Missing when it differs. */
    currentDb: number | undefined;
    onClose: () => void;
    /** Called when the gain has been set, so that what shows the gain can ask again. */
    onSet: () => void;
};

/** Sets how much louder than normal every track of an album is played, 0 to the most it can be. */
export const AlbumGainDialog: React.FC<AlbumGainDialogProps> = ({ trackIds, currentDb, onClose, onSet }) => {
    const portalContainer = usePortalContainerRef();
    const send = usePlayerCommand();
    const open = trackIds !== undefined;
    const [gainDb, setGainDb] = useState(0);
    useEffect(() => {
        if (open) setGainDb(currentDb ?? 0);
    }, [open, currentDb]);

    const save = async () => {
        if (await send("player_set_tracks_gain", { trackIds: trackIds ?? [], gainDb })) {
            onSet();
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} container={portalContainer.current} maxWidth="xs" fullWidth>
            <DialogTitle>Gain of the album</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary">
                    {currentDb === undefined
                        ? "The tracks have different gains. Saving gives all of them the one below."
                        : "How much louder than normal every track of the album is played."}
                </Typography>
                <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
                    <IconButton aria-label="Quieter" disabled={gainDb <= 0} onClick={() => setGainDb(gainDb - GAIN_STEP_DB)}>
                        <RemoveIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ minWidth: 88, textAlign: "center" }}>
                        {gainDb > 0 ? `+${gainDb}` : gainDb} dB
                    </Typography>
                    <IconButton aria-label="Louder" disabled={gainDb >= MAX_GAIN_DB} onClick={() => setGainDb(gainDb + GAIN_STEP_DB)}>
                        <AddIcon />
                    </IconButton>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={() => void save()}>Save</Button>
            </DialogActions>
        </Dialog>
    );
};
