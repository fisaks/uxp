import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Chip, IconButton, Popover, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { NodeViewWrapper } from '@tiptap/react';
import { buildPath } from '@uxp/common';
import React, { useMemo, useRef, useState } from 'react';
import { useRichEditorUI } from '../RichEditorContext';
import { getMimeIcon } from '../utils/getMimeIcon';
type AttachmentNodeProps = {
    node: any;
    updateAttributes: (attrs: any) => void;
    deleteNode: () => void;
    editor: any;
    extension: { options: { basePath?: string } };
};

const AttachmentNode = ({ node, updateAttributes, deleteNode, editor, extension: { options: { basePath } } }: AttachmentNodeProps) => {

    const { name, url, mimetype } = node.attrs;
    const icon = useMemo(() => getMimeIcon(mimetype), [mimetype]);
    const { portalContainerRef } = useRichEditorUI();
    const chipRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const { isEditable } = editor;
    const fullUrl = basePath && !url.startsWith('http') ? buildPath(basePath, url) : url;
    const slotProps = { popper: { container: portalContainerRef.current } };

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        if (isEditable) {
            setAnchorEl(event.currentTarget);
        } else {
            openLink();
        }
    };

    const handleClose = () => {
        setAnchorEl(null);
    };
    const openLink = () => {
        if (fullUrl) window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
    const handleDelete = () => {
        deleteNode(); // Removes the attachment node
        handleClose();
    };

    const open = Boolean(anchorEl);

    return (
        <NodeViewWrapper as="span"
            style={{ display: 'inline-block', cursor: isEditable ? 'grab' : undefined }}>
            <Tooltip title={fullUrl} slotProps={slotProps} enterDelay={2000} leaveDelay={500} >
                <Chip
                    draggable={isEditable ? true : undefined} data-drag-handle
                    ref={chipRef}
                    icon={icon}
                    className='uxp-editor-attachment-node'
                    label={name}
                    size="small"
                    onClick={handleClick}
                    sx={{ cursor: 'pointer' }}
                />
            </Tooltip>
            <Popover

                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                container={portalContainerRef?.current ?? undefined}
            >
                <Stack spacing={1} sx={{ p: 2, minWidth: 300 }}>
                    <Typography variant="subtitle2">Edit Attachment</Typography>
                    <TextField
                        label="Name"
                        size="small"
                        value={name}
                        onChange={(e) => updateAttributes({ name: e.target.value })}
                    />
                    <Stack direction="row" justifyContent="space-between" spacing={2}>
                        <IconButton onClick={handleClose} size="small" color="error">
                            <CheckIcon />
                        </IconButton>

                        <IconButton onClick={openLink} size="small" color="error">
                            <OpenInNewIcon />
                        </IconButton>

                        <IconButton onClick={handleDelete} size="small" color="error">
                            <DeleteIcon />
                        </IconButton>
                    </Stack>
                </Stack>
            </Popover>

        </NodeViewWrapper>
    );
};

export default AttachmentNode;
