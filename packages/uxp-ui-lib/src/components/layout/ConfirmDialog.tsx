import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { nanoid } from "@reduxjs/toolkit";
import { usePortalContainerRef } from "../../features/shadow-root/ShadowRootContext";
import { FormattedMessage, FormattedMessageType } from "./FormattedMessage";


type ConfirmDialogProps = {

    open: boolean;
    title: string;
    confirmText: string | FormattedMessageType;


    onConfirm: () => void;
    onCancel: () => void;
    id?: string
    btnConfirm?: string;
    btnCancel?: string;

};
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    id,
    open,
    title,
    onConfirm,
    onCancel,
    confirmText,
    btnConfirm,
    btnCancel

}) => {
    const dialogId = id ? id : nanoid();
    const portalContainer = usePortalContainerRef();
    return (
        <Dialog
            open={open}
            onClose={onCancel}
            aria-labelledby={dialogId}
            container={portalContainer.current}

        >
            <DialogTitle id={dialogId}>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {typeof confirmText === "string" ? confirmText : <FormattedMessage {...confirmText} />}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel} color="inherit">{btnCancel || "Cancel"}</Button>
                <Button onClick={onConfirm} color="error" variant="contained" autoFocus>
                    {btnConfirm || "Confirm"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};  