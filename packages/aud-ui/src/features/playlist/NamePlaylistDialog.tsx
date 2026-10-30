import { MAX_PLAYLIST_NAME_LENGTH } from "@aud/common";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useState } from "react";

type NamePlaylistDialogProps = {
    open: boolean;
    title: string;
    initialName?: string;
    submitLabel: string;
    onSubmit: (name: string) => void;
    onClose: () => void;
};

/** Asks for the name of a playlist, for a new one or to rename one. */
export const NamePlaylistDialog: React.FC<NamePlaylistDialogProps> = ({
    open,
    title,
    initialName = "",
    submitLabel,
    onSubmit,
    onClose,
}) => {
    const portalContainer = usePortalContainerRef();
    const [name, setName] = useState(initialName);
    useEffect(() => {
        if (open) setName(initialName);
    }, [open, initialName]);
    const valid = name.trim() !== "";
    const submit = () => valid && onSubmit(name.trim());

    return (
        <Dialog open={open} onClose={onClose} container={portalContainer.current} maxWidth="xs" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    slotProps={{ htmlInput: { maxLength: MAX_PLAYLIST_NAME_LENGTH } }}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={submit} variant="contained" disabled={!valid}>
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
