import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, ModalProps } from "@mui/material";
import React from "react";

type RemoveAllFavoritesDialogProps = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    container?: ModalProps["container"];
};

export const RemoveAllFavoritesDialog: React.FC<RemoveAllFavoritesDialogProps> = ({ open, onClose, onConfirm, container }) => (
    <Dialog open={open} onClose={onClose} container={container}>
        <DialogTitle>Remove all favorites</DialogTitle>
        <DialogContent>
            <DialogContentText>
                Remove all favorites? This cannot be undone.
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={onConfirm} color="error" variant="contained">Remove all</Button>
        </DialogActions>
    </Dialog>
);
