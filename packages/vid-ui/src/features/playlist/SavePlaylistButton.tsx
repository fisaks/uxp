import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { PLAYLIST_NAME_MAX_LENGTH, PlaylistSource } from "@vid/common";
import React, { useState } from "react";
import { errorMessage } from "../../api/axiosBaseQuery";
import { useGetPlaylistsQuery, useSavePlaylistMutation } from "./playlist.api";
import { WARNING_SX, samePlaylistName } from "./playlistText";

const SAVE_FAILED_TEXT = "The playlist could not be saved.";

/** Saves a queue, of a Chromecast or of the player tab, as a playlist. A name that is taken is replaced, which the button says before it is pressed. */
export const SavePlaylistButton: React.FC<{ source: PlaylistSource }> = ({ source }) => {
    const portalContainer = usePortalContainerRef();
    const { data: playlists = [] } = useGetPlaylistsQuery();
    const [save, { isLoading }] = useSavePlaylistMutation();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState<string>();

    const trimmed = name.trim();
    const replaces = playlists.some((p) => samePlaylistName(p.name, trimmed));

    const close = () => {
        setOpen(false);
        setError(undefined);
    };
    const submit = async () => {
        const result = await save({ ...source, name: trimmed, replace: replaces });
        if ("error" in result)
            return setError(errorMessage(result.error) ?? (result.error as { message?: string }).message ?? SAVE_FAILED_TEXT);
        close();
    };

    return (
        <>
            <Button size="small" startIcon={<PlaylistAddIcon />} onClick={() => setOpen(true)}>
                Save as playlist
            </Button>
            <Dialog open={open} container={portalContainer.current} onClose={close} fullWidth maxWidth="xs">
                <DialogTitle>Save the queue as a playlist</DialogTitle>
                <DialogContent>
                    <Autocomplete
                        freeSolo
                        autoSelect
                        options={playlists.map((p) => p.name)}
                        inputValue={name}
                        onInputChange={(_event, value) => setName(value)}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                autoFocus
                                margin="dense"
                                label="Name"
                                error={error !== undefined}
                                helperText={error ?? (replaces ? "A playlist with this name exists. It is replaced." : " ")}
                                slotProps={{ htmlInput: { ...params.inputProps, maxLength: PLAYLIST_NAME_MAX_LENGTH } }}
                            />
                        )}
                        slotProps={{ popper: { container: portalContainer.current } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={close}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={replaces ? "warning" : "primary"}
                        sx={replaces ? WARNING_SX : undefined}
                        disabled={trimmed === "" || isLoading}
                        onClick={submit}
                    >
                        {replaces ? "Replace" : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
