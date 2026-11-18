import DeleteIcon from "@mui/icons-material/Delete";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack, Typography } from "@mui/material";
import { HomeVideoClip } from "@vid/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { rejectionText } from "../../api/errorText";
import { useAppDispatch } from "../../hooks";
import { HOME_VIDEOS_PATH } from "../../menu";
import { clipName, LOCALE } from "./clipFormat";
import { useDeleteClipMutation } from "./home-video.api";
import { saveFailed } from "./saveErrorSlice";

/** The name of the file without the folder and the ending: the short id that tells the clip on the server. */
const shortId = (clip: HomeVideoClip) => clip.file.replace(/^.*\//, "").replace(/\.[^.]*$/, "");

/** Who uploaded the clip and the way to delete it. Only a clip that was uploaded can be deleted; its file is kept in the trash for 30 days. */
export const ClipDelete: React.FC<{ clip: HomeVideoClip }> = ({ clip }) => {
    const [open, setOpen] = useState(false);
    const [deleteClip, { isLoading }] = useDeleteClipMutation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const portalContainer = usePortalContainerRef();

    if (!clip.uploadedBy) return null;

    const confirm = async () => {
        const result = await deleteClip(clip.id);
        if ("error" in result) {
            setOpen(false);
            dispatch(saveFailed(rejectionText(result)));
        } else {
            navigate(HOME_VIDEOS_PATH, { replace: true });
        }
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                        Uploaded by {clip.uploadedBy}
                        {clip.uploadedAt && ` · ${new Date(clip.uploadedAt).toLocaleString(LOCALE)}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div" sx={{ overflowWrap: "anywhere" }}>
                        {clip.originalName && `${clip.originalName} · `}
                        {shortId(clip)}
                    </Typography>
                </Box>
                <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={() => setOpen(true)}>
                    Delete
                </Button>
            </Stack>
            <Dialog open={open} onClose={() => setOpen(false)} container={portalContainer.current}>
                <DialogTitle>Delete the clip?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        “{clipName(clip)}” is taken out of the clips, playlists and queues. The file is kept in the trash for 30 days.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button color="error" onClick={() => void confirm()} disabled={isLoading}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
