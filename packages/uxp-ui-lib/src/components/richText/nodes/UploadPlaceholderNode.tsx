import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import { Editor, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useMemo } from 'react';

import CancelIcon from '@mui/icons-material/Cancel';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import VideoFileIcon from '@mui/icons-material/OndemandVideo';
import ReplayIcon from '@mui/icons-material/Replay';
import { UploadStatus } from '../../../features/upload-tracking/uploadTracking.types';
import { useUxpDeviceId } from '../../../hooks/useUxpDeviceId';
import { formatFileSize } from '../../../util/formatFileSize';
import LinearProgressWithLabel from '../../layout/LinearProgressWithLabel';
import { useRichEditorUI } from '../RichEditorContext';

type UploadPlaceholderNodeProps = {
    node: any;
    updateAttributes: (attrs: Record<string, any>) => void;
}


const UploadPlaceholderNode: React.FC<UploadPlaceholderNodeProps> = ({ node, updateAttributes }) => {
    const {
        fileName,
        fileType,
        fileSize,
        progress,
        status,
        errorMessage,
        speed,
        uploaderName,
        deviceId,
    } = node.attrs;

    const theme = useTheme();
    const localDeviceId = useUxpDeviceId();
    const { retryHandler, cancelUpload } = useRichEditorUI();

    const Icon = useMemo(() => {
        if (fileType?.startsWith('image/')) return ImageIcon;
        if (fileType?.startsWith('video/')) return VideoFileIcon;
        if (fileType === 'application/pdf') return DescriptionIcon;
        return InsertDriveFileIcon;
    }, [fileType]);



    const handleRetry = () => retryHandler?.(node.attrs.id);
    const handleCancel = () => cancelUpload?.(node.attrs.id);

    const isLocalUploader = localDeviceId === deviceId;
    const showProgress = status === 'uploading';
    const showError = status === 'error';
    const showCanceled = status === 'canceled';

    return (
        <NodeViewWrapper className="upload-placeholder"
            style={{
                border: '1px dashed',
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
                padding: theme.spacing(1.5),
                borderRadius: theme.shape.borderRadius,
                marginTop: theme.spacing(1),
                marginBottom: theme.spacing(1),
            }}
        >
            <Box display="flex" alignItems="center" gap={1}>
                <Icon fontSize="small" />
                <Typography variant="body2" fontWeight={500} noWrap>
                    {fileName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    ({formatFileSize(fileSize)})
                </Typography>
            </Box>

            <Box mt={1}>
                {showProgress && (
                    <LinearProgressWithLabel value={progress} label="Uploading" speed={speed} />
                )}

                {showError && (
                    <Typography color="error" variant="body2" mt={1}>
                        {errorMessage || 'Upload failed'}
                    </Typography>
                )}
                {showCanceled && (
                    <Typography color="info" variant="body2" mt={1}>
                        Upload canceled
                    </Typography>
                )}
            </Box>

            <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                <Typography variant="caption" color="text.secondary">
                    Uploaded by {uploaderName}
                </Typography>

                {isLocalUploader && (
                    <Box display="flex" alignItems="center" gap={1}>
                        {(showError || showCanceled) && (
                            <Tooltip title="Retry">
                                <IconButton onClick={handleRetry} size="small">
                                    <ReplayIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                        {(showProgress) && (
                            <Tooltip title="Cancel">
                                <IconButton onClick={handleCancel} size="small">
                                    <CancelIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
            </Box>
        </NodeViewWrapper>
    );
};

export default UploadPlaceholderNode;
