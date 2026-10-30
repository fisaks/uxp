import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { MAX_PLAYLIST_NAME_LENGTH } from "@aud/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useState } from "react";
import { formatDuration } from "../library/libraryFormat";
import { useRequest } from "../shared/useRequest";
import { usePlayerActions } from "../player/usePlayerActions";
import { usePlaylistCommand } from "./usePlaylistCommand";

type AddToPlaylistDialogProps = {
    /** The tracks to put in a playlist. The dialog is open while there are some. */
    trackIds: string[] | undefined;
    title: string;
    onClose: () => void;
};

const countOf = (count: number) => `${count} ${count === 1 ? "track" : "tracks"}`;

/** Puts tracks in a playlist that is there or in a new one, and says so afterwards. */
export const AddToPlaylistDialog: React.FC<AddToPlaylistDialogProps> = ({ trackIds, title, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const open = trackIds !== undefined;
    const { data: playlists } = useRequest("playlist_list", {}, { enabled: open });
    const send = usePlaylistCommand();
    const { notify } = usePlayerActions();
    const [newName, setNewName] = useState("");
    useEffect(() => {
        if (open) setNewName("");
    }, [open]);

    const add = async (id: string, name: string) => {
        if (await send("playlist_add_tracks", { id, trackIds: trackIds ?? [] })) {
            notify(`Added ${countOf(trackIds?.length ?? 0)} to "${name}"`);
            onClose();
        }
    };
    const create = async () => {
        const name = newName.trim();
        if (name !== "" && (await send("playlist_create", { name, trackIds: trackIds ?? [] }))) {
            notify(`Saved ${countOf(trackIds?.length ?? 0)} as "${name}"`);
            onClose();
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} container={portalContainer.current} maxWidth="xs" fullWidth>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <TextField
                            size="small"
                            fullWidth
                            label="New playlist"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && void create()}
                            slotProps={{ htmlInput: { maxLength: MAX_PLAYLIST_NAME_LENGTH } }}
                        />
                        <Button variant="contained" onClick={create} disabled={newName.trim() === ""}>
                            Create
                        </Button>
                    </Stack>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                        Or add to
                    </Typography>
                    {playlists?.length === 0 && <Typography color="text.secondary">There are no playlists yet.</Typography>}
                    <List disablePadding>
                        {[...(playlists ?? [])]
                            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                            .map((playlist) => (
                                <ListItemButton key={playlist.id} onClick={() => add(playlist.id, playlist.name)}>
                                    <ListItemText
                                        primary={playlist.name}
                                        secondary={`${countOf(playlist.trackCount)}${playlist.durationSec > 0 ? ` · ${formatDuration(playlist.durationSec)}` : ""}`}
                                    />
                                </ListItemButton>
                            ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
