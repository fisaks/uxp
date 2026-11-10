import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StopIcon from "@mui/icons-material/Stop";
import {
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { CAST_GROUP_MIN_MEMBERS, CAST_GROUP_NAME_MAX_LENGTH, CastGroup, CastGroupRequest } from "@vid/common";
import React, { useState } from "react";
import { errorMessage } from "../../api/axiosBaseQuery";
import { useCast } from "../cast/useCast";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { samePlaylistName, WARNING_SX } from "../playlist/playlistText";
import { useCreateCastGroupMutation, useDeleteCastGroupMutation, useGetCastGroupsQuery, useUpdateCastGroupMutation } from "./castGroup.api";

const CHANGE_FAILED_TEXT = "That could not be done.";

const failureText = (error: unknown) => errorMessage(error) ?? (error as { message?: string }).message ?? CHANGE_FAILED_TEXT;

/** The group to change, or a new one when there is none. */
const GroupDialog: React.FC<{ group?: CastGroup; onClose: () => void }> = ({ group, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const { state } = useCast();
    const { data: groups = [] } = useGetCastGroupsQuery();
    const [create, { isLoading: creating }] = useCreateCastGroupMutation();
    const [update, { isLoading: updating }] = useUpdateCastGroupMutation();
    const [name, setName] = useState(group?.name ?? "");
    const [deviceIds, setDeviceIds] = useState<string[]>(group?.deviceIds ?? []);
    const [browser, setBrowser] = useState(group?.browser ?? false);
    const [error, setError] = useState<string>();
    const trimmed = name.trim();
    const taken = groups.some((g) => g.id !== group?.id && samePlaylistName(g.name, trimmed));
    // The devices that are found now, and the ones of the group that are not found, so they can be taken out.
    const found = state?.devices ?? [];
    const lost = (group?.deviceIds ?? []).filter((id) => !found.some((d) => d.id === id));
    const choices = [...found.map((d) => ({ id: d.id, label: d.name })), ...lost.map((id) => ({ id, label: "Not found" }))];

    const toggle = (id: string) => setDeviceIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));

    const submit = async () => {
        const request: CastGroupRequest = { name: trimmed, deviceIds, browser };
        const result = group ? await update({ id: group.id, ...request }) : await create(request);
        if ("error" in result) return setError(failureText(result.error));
        onClose();
    };

    const valid = trimmed !== "" && !taken && deviceIds.length + (browser ? 1 : 0) >= CAST_GROUP_MIN_MEMBERS;
    return (
        <Dialog open container={portalContainer.current} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>{group ? "Change the group" : "New group"}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    margin="dense"
                    label="Name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    error={taken}
                    helperText={taken ? "Another group has this name." : " "}
                    slotProps={{ htmlInput: { maxLength: CAST_GROUP_NAME_MAX_LENGTH } }}
                />
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Chromecasts
                </Typography>
                <FormGroup>
                    {choices.map(({ id, label }) => (
                        <FormControlLabel
                            key={id}
                            label={label}
                            control={<Checkbox checked={deviceIds.includes(id)} onChange={() => toggle(id)} />}
                        />
                    ))}
                </FormGroup>
                <FormControlLabel
                    label="Player tab (this browser)"
                    control={<Checkbox checked={browser} onChange={(event) => setBrowser(event.target.checked)} />}
                />
                <FormHelperText error={error !== undefined}>
                    {error ?? `At least ${CAST_GROUP_MIN_MEMBERS} members play together, the player tab counts as one.`}
                </FormHelperText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button disabled={!valid || creating || updating} onClick={submit}>
                    {group ? "Save" : "Create"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const DeleteDialog: React.FC<{ group: CastGroup; onClose: () => void }> = ({ group, onClose }) => {
    const portalContainer = usePortalContainerRef();
    const [remove, { isLoading }] = useDeleteCastGroupMutation();
    const [error, setError] = useState<string>();

    const submit = async () => {
        const result = await remove(group.id);
        if ("error" in result) return setError(failureText(result.error));
        onClose();
    };

    return (
        <Dialog open container={portalContainer.current} onClose={onClose}>
            <DialogTitle>Delete {group.name}?</DialogTitle>
            <DialogContent>
                <DialogContentText color={error ? "error" : undefined}>{error ?? "The Chromecasts stay as they are."}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" color="warning" sx={WARNING_SX} disabled={isLoading} onClick={submit}>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const GroupCard: React.FC<{ group: CastGroup; playing: boolean }> = ({ group, playing }) => {
    const { state, stop } = useCast();
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const names = group.deviceIds.map((id) => state?.devices.find((d) => d.id === id)?.name ?? "Not found");

    return (
        <Card variant="outlined">
            <CardContent>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
                    {group.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {[...names, ...(group.browser ? ["Player tab"] : [])].join(" · ")}
                </Typography>
                <Stack direction="row" alignItems="center" sx={{ mt: 0.5, ml: -1 }}>
                    {playing ? (
                        <LabelledIconButton label="Stop the group, to change or delete it" onClick={() => stop(group.id)}>
                            <StopIcon />
                        </LabelledIconButton>
                    ) : (
                        <>
                            <LabelledIconButton label="Change" onClick={() => setEditing(true)}>
                                <EditIcon />
                            </LabelledIconButton>
                            <LabelledIconButton label="Delete" onClick={() => setDeleting(true)}>
                                <DeleteIcon />
                            </LabelledIconButton>
                        </>
                    )}
                    {playing && (
                        <Typography variant="body2" color="primary" sx={{ ml: 1 }}>
                            Playing
                        </Typography>
                    )}
                </Stack>
            </CardContent>
            {editing && <GroupDialog group={group} onClose={() => setEditing(false)} />}
            {deleting && <DeleteDialog group={group} onClose={() => setDeleting(false)} />}
        </Card>
    );
};

/** The groups of Chromecasts that play in sync. A group is played from the same menus as a single Chromecast. */
export const CastGroupsPage: React.FC = () => {
    const { data: groups } = useGetCastGroupsQuery();
    const { state } = useCast();
    const [creating, setCreating] = useState(false);
    const isPlaying = (id: string) => state?.sessions.some((s) => s.deviceId === id && s.state !== "ENDED" && s.state !== "FAILED");

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <Button startIcon={<AddIcon />} onClick={() => setCreating(true)} sx={{ mb: 1 }}>
                New group
            </Button>
            {groups?.length === 0 && (
                <Typography color="text.secondary">No groups yet. A group plays the same clips on several Chromecasts at once.</Typography>
            )}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(420px, 1fr))" }, gap: 1.5 }}>
                {[...(groups ?? [])]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((group) => (
                        <GroupCard key={group.id} group={group} playing={!!isPlaying(group.id)} />
                    ))}
            </Box>
            {creating && <GroupDialog onClose={() => setCreating(false)} />}
        </Box>
    );
};
