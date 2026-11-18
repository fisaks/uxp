import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import UploadIcon from "@mui/icons-material/Upload";
import { Alert, Box, Button, IconButton, LinearProgress, Paper, Stack, Typography } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterLuxon } from "@mui/x-date-pickers/AdapterLuxon";
import { ErrorCodes } from "@uxp/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { DateTime } from "luxon";
import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { errorText } from "../../api/errorText";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { clipPath } from "../home-video/ClipTile";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useGetUploadStatusQuery } from "./upload.api";
import { cancelUpload, dropFile, holdFile, sendQueued } from "./uploadRunner";
import { selectSending, selectUploads } from "./uploadSelectors";
import { dateSet, finishedCleared, itemRemoved, itemsAdded, phaseSet, UploadItem } from "./uploadSlice";
import { useWakeLock } from "./useWakeLock";

const MB = 1024 * 1024;
const GB = 1024 * MB;

const formatSize = (bytes: number) => (bytes >= GB ? `${(bytes / GB).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / MB))} MB`);

const phaseText = (item: UploadItem): string => {
    switch (item.phase) {
        case "ready":
            return "Ready";
        case "queued":
            return "Waiting";
        case "uploading":
            return `Sending ${Math.round((item.sent / item.sizeBytes) * 100)} %`;
        case "paused":
            return item.errorCode === ErrorCodes.SYSTEM_BUSY ? errorText({ error: { code: item.errorCode } }) : "Stopped, the server cannot be reached. Resume when it is back.";
        case "processing":
            return "Making it ready…";
        case "done":
            return "Done";
        case "failed":
            return errorText({ error: { code: item.errorCode } });
    }
};

const UploadRow: React.FC<{ item: UploadItem }> = ({ item }) => {
    const dispatch = useAppDispatch();
    const portalContainer = usePortalContainerRef();
    const inProgress = item.phase === "queued" || item.phase === "uploading";
    const remove = () => {
        void dispatch(cancelUpload(item.key));
        dropFile(item.key);
        dispatch(itemRemoved(item.key));
    };
    const resume = () => {
        dispatch(phaseSet({ key: item.key, phase: "queued" }));
        void dispatch(sendQueued);
    };

    return (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                        {item.name}
                    </Typography>
                    <Typography variant="caption" color={item.phase === "failed" ? "error" : "text.secondary"} component="div">
                        {formatSize(item.sizeBytes)} · {phaseText(item)}
                    </Typography>
                </Box>
                {item.phase === "paused" && (
                    <IconButton color="primary" aria-label="Resume" onClick={resume}>
                        <PlayArrowIcon />
                    </IconButton>
                )}
                {item.phase === "done" && item.clipId && (
                    <Button component={Link} to={clipPath(item.clipId)} size="small">
                        Open
                    </Button>
                )}
                {item.phase !== "processing" && item.phase !== "done" && (
                    <IconButton aria-label={inProgress ? "Cancel" : "Remove"} onClick={remove}>
                        <CloseIcon />
                    </IconButton>
                )}
            </Stack>
            {item.phase === "ready" && (
                <Box sx={{ mt: 1.5 }}>
                    <LocalizationProvider dateAdapter={AdapterLuxon} adapterLocale="fi">
                        <DatePicker
                            label="Date (from the video if empty)"
                            format="d.M.yyyy"
                            value={item.date ? DateTime.fromISO(item.date) : null}
                            onChange={(value) => {
                                // Typing passes through values that are not dates yet: only a whole date, or an emptied field, is taken.
                                if (value === null || value.isValid) dispatch(dateSet({ key: item.key, date: value?.toISODate() ?? null }));
                            }}
                            slotProps={{
                                textField: { size: "small", fullWidth: true },
                                field: { clearable: true },
                                popper: { container: portalContainer.current },
                                dialog: { container: portalContainer.current },
                            }}
                        />
                    </LocalizationProvider>
                </Box>
            )}
            {(item.phase === "uploading" || item.phase === "paused" || item.phase === "processing") && (
                <LinearProgress
                    variant={item.phase === "processing" ? "indeterminate" : "determinate"}
                    value={(item.sent / item.sizeBytes) * 100}
                    sx={{ mt: 1.5 }}
                />
            )}
        </Paper>
    );
};

let nextKey = 0;

/** Picks videos from the phone, sends them one at a time in chunks, and shows where each one is. */
export const UploadPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const items = useAppSelector(selectUploads);
    const sending = useAppSelector(selectSending);
    const { data: status, isError: statusFailed } = useGetUploadStatusQuery();
    const input = useRef<HTMLInputElement>(null);
    useWakeLock(sending);

    const add = (picked: FileList | null) => {
        if (!picked || !status) return;
        const added: UploadItem[] = [...picked].map((file) => {
            const key = String(nextKey++);
            holdFile(key, file);
            const tooLarge = file.size > status.maxFileBytes;
            return {
                key,
                name: file.name,
                sizeBytes: file.size,
                date: null,
                phase: tooLarge ? "failed" : "ready",
                errorCode: tooLarge ? ErrorCodes.FILE_TOO_LARGE : undefined,
                sent: 0,
            };
        });
        dispatch(itemsAdded(added));
        if (input.current) input.current.value = ""; // so the same file can be picked again
    };
    const start = () => {
        items.filter((i) => i.phase === "ready").forEach((i) => dispatch(phaseSet({ key: i.key, phase: "queued" })));
        void dispatch(sendQueued);
    };

    const ready = items.filter((i) => i.phase === "ready").length;
    const finished = items.filter((i) => i.phase === "done").length;

    if (statusFailed) return <Alert severity="error">The upload could not be checked.</Alert>;
    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {status && !status.enabled && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    There is not enough room on the server for an upload: {formatSize(status.freeBytes)} is free.
                </Alert>
            )}
            <Stack direction="row" sx={{ gap: 1, mb: 2 }}>
                <Button variant="outlined" startIcon={<AddIcon />} disabled={!status?.enabled} onClick={() => input.current?.click()}>
                    Add videos
                </Button>
                <Button variant="contained" startIcon={<UploadIcon />} disabled={ready === 0} onClick={start}>
                    Upload {ready > 0 ? ready : ""}
                </Button>
                {finished > 0 && <Button onClick={() => dispatch(finishedCleared())}>Clear done</Button>}
            </Stack>
            <input ref={input} type="file" accept="video/*" multiple hidden onChange={(e) => add(e.target.files)} />
            {sending && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Keep the screen on and stay in the app while the videos are sent.
                </Alert>
            )}
            {items.length === 0 && <Typography color="text.secondary">Add the videos to send, then press Upload.</Typography>}
            <Stack sx={{ gap: 1 }}>
                {items.map((item) => (
                    <UploadRow key={item.key} item={item} />
                ))}
            </Stack>
        </Box>
    );
};
