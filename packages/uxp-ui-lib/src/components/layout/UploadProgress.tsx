import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ReplayIcon from '@mui/icons-material/Replay';
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from 'react';
import { UploadStatus } from '../../features/upload-tracking/uploadTracking.types';
import { formatFileSize } from '../../util/formatFileSize';
import { FormattedMessage, FormattedMessageType } from './FormattedMessage';
import LinearProgressWithLabel from './LinearProgressWithLabel';
import { ErrorCodeMessageMap, mapApiErrorCodeToMessage } from '../../util/browserErrorMessage';

type UploadProgressProps = {
    uploadStatus: UIUploadStatus | undefined|null;
    onCancel: () => void;
    onRetry?: () => void;
    autoHideDelay?: number;
    successMessage?: FormattedMessageType;
    errorCodeMessageMap?: ErrorCodeMessageMap;
};

type UIUploadStatus = {
    file: UploadStatus<unknown>["file"]
    status: UploadStatus<unknown>["status"];

    progress?: UploadStatus<unknown>["progress"];
    speed?: UploadStatus<unknown>["speed"];
    errorCode?: UploadStatus<unknown>["errorCode"];

};


export const UploadProgress: React.FC<UploadProgressProps> = ({
    uploadStatus,
    onCancel,
    onRetry,
    successMessage,
    errorCodeMessageMap,
    autoHideDelay = 5000,
}) => {

    const [visible, setVisible] = useState(true);
    useEffect(() => {
        if (!uploadStatus) return;

        if (uploadStatus.status === "done" && autoHideDelay > 0) {
            const t = setTimeout(() => {
                setVisible(false);

            }, autoHideDelay);

            return () => clearTimeout(t);
        }
        if (uploadStatus.status === "uploading") {
            setVisible(true);
        }
        return;
    }, [uploadStatus, autoHideDelay]);

    if (!uploadStatus || !visible) return null;

    const { status, file, progress, errorCode, speed } = uploadStatus;

    const showCancel = status === "uploading";
    const showRetry = status === "error" || status === "canceled";
    const showSuccess = status === "done";
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: 'background.paper',
            }}
        >
            <Box display="flex" gap={1.5}>
                {/* FILE ICON (anchors the whole row visually) */}
                <InsertDriveFileIcon sx={{ color: 'text.secondary', mt: 0.2 }} />

                <Box flexGrow={1}>
                    {/* FILE HEADER */}
                    <Box display="flex" alignItems="baseline" gap={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                            {file.name}
                        </Typography>

                        <Typography variant="caption" color="text.secondary" noWrap>
                            ({formatFileSize(file.size)})
                        </Typography>
                    </Box>

                    {/* PROGRESS OR STATUS MESSAGE */}
                    <Box mt={0.5}>
                        {status === "uploading" && (
                            <LinearProgressWithLabel
                                value={progress ?? 0}
                                label="Uploading"
                                speed={speed}
                            />
                        )}

                        {status === "error" && (
                            <Typography color="error" variant="body2">
                                {errorCode ? mapApiErrorCodeToMessage(errorCode,errorCodeMessageMap) : "Upload failed"}
                            </Typography>
                        )}

                        {status === "canceled" && (
                            <Typography color="info" variant="body2">
                                Upload canceled
                            </Typography>
                        )}
                        {showSuccess && (
                            <Box display="flex" alignItems="center" gap={1}>
                                <CheckCircleIcon color="success" fontSize="small" />
                                <Typography color="success.main" variant="body2">
                                    {successMessage ? <FormattedMessage {...successMessage} /> : "Done"}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* ACTION BUTTONS */}
                <Box display="flex" alignItems="center" ml={1}>
                    {showCancel && (
                        <Tooltip title="Cancel">
                            <IconButton size="small" onClick={onCancel}>
                                <CancelIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    {showRetry && onRetry && (
                        <Tooltip title="Retry">
                            <IconButton size="small" onClick={onRetry}>
                                <ReplayIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Paper>
    );
};
