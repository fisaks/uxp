import CloseIcon from "@mui/icons-material/Close";
import { Alert, Button, IconButton } from "@mui/material";
import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectPlayerError, selectPlayerNotice } from "./playerSelectors";
import { playerErrorDismissed, playerNoticeDismissed } from "./playerSlice";
import { usePlayerActions } from "./usePlayerActions";

const NOTICE_MS = 3500;
// A message with Undo is there long enough to be read and pressed.
const NOTICE_WITH_UNDO_MS = 8000;
const ERROR_MS = 8000;

/**
 * What the last command did, or why it failed, in the column of the app right above the player where the eyes already are.
 * (A pop up at the edge of the window is far away on a wide screen.) A message with Undo is for a queue that was taken away.
 */
export const NoticeStrip: React.FC = () => {
    const error = useAppSelector(selectPlayerError);
    const notice = useAppSelector(selectPlayerNotice);
    const dispatch = useAppDispatch();
    const { undo } = usePlayerActions();

    // A new message gets its own time, so one that comes while another is shown is not cut short.
    useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => dispatch(playerNoticeDismissed()), notice.undo ? NOTICE_WITH_UNDO_MS : NOTICE_MS);
        return () => clearTimeout(timer);
    }, [notice, dispatch]);
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => dispatch(playerErrorDismissed()), ERROR_MS);
        return () => clearTimeout(timer);
    }, [error, dispatch]);

    if (error) {
        return (
            <Alert
                variant="filled"
                severity="error"
                sx={{ mb: 1, boxShadow: 6 }}
                action={
                    <IconButton color="inherit" size="small" aria-label="Close" onClick={() => dispatch(playerErrorDismissed())}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            >
                {error}
            </Alert>
        );
    }
    if (!notice) {
        return null;
    }
    return (
        <Alert
            variant="filled"
            severity="info"
            icon={false}
            sx={{ mb: 1, boxShadow: 6, alignItems: "center" }}
            action={
                notice.undo ? (
                    <Button
                        color="inherit"
                        variant="outlined"
                        size="small"
                        onClick={() => {
                            dispatch(playerNoticeDismissed());
                            void undo();
                        }}
                    >
                        Undo
                    </Button>
                ) : (
                    <IconButton color="inherit" size="small" aria-label="Close" onClick={() => dispatch(playerNoticeDismissed())}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )
            }
        >
            {notice.text}
        </Alert>
    );
};
