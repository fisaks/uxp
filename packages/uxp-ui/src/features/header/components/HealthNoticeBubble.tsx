import { Alert, Snackbar } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { selectHealthNotice } from "../healthSelectors";
import { clearHealthNotice } from "../healthSlice";

const AUTO_HIDE_MS = 4000;

const severityMap = {
    ok: "success",
    warn: "warning",
    error: "error",
} as const;
export const HealthNoticeBubble: React.FC = () => {
    const notice = useSelector(selectHealthNotice);
    const dispatch = useDispatch();

    // Close handler (Snackbar + Alert share this)
    const handleClose = (_?: unknown, reason?: string) => {
        if (reason === "clickaway") return;
        dispatch(clearHealthNotice());
    };


    return (
        <Snackbar
            key={notice?.timestamp}
            open={Boolean(notice)}
            autoHideDuration={AUTO_HIDE_MS}
            onClose={handleClose}
            anchorOrigin={{
                vertical: "top",
                horizontal: "right",
            }}
            sx={{
                mt: 2.4, // push below app bar if needed
            }}
        >
            {notice && (
                <Alert
                    severity={severityMap[notice.severity]}
                    onClose={handleClose}
                    variant="filled"
                    elevation={6}
                >
                    {notice.message}
                </Alert>
            )}
        </Snackbar>
    );
};
