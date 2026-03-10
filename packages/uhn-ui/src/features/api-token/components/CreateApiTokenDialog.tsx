import CloseIcon from "@mui/icons-material/Close";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
} from "@mui/material";
import { mapApiErrorsToMessageString, usePortalContainerRef } from "@uxp/ui-lib";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../app/store";
import { useFetchBlueprintsQuery } from "../../blueprint/blueprint.api";
import { useCreateApiTokenMutation, useFetchApiTokensQuery } from "../apiToken.api";
import { selectCreateDialog } from "../apiTokenSelector";
import { closeCreateDialog, openCreatedDialog } from "../apiTokenSlice";

export const CreateApiTokenDialog: React.FC = () => {
    const portalContainer = usePortalContainerRef();
    const dispatch = useAppDispatch();
    const { open } = useSelector(selectCreateDialog);

    const [label, setLabel] = useState("");
    const [blueprintIdentifier, setBlueprintIdentifier] = useState("");
    const [createApiToken, { isLoading, error, reset }] = useCreateApiTokenMutation();
    const { data: blueprints } = useFetchBlueprintsQuery();
    const { data: existingTokens } = useFetchApiTokensQuery();
    const identifierOptions = useMemo(
        () => blueprints?.map((b) => b.identifier) ?? [],
        [blueprints]
    );
    const activeTokenLabels = useMemo(
        () => new Set(
            existingTokens
                ?.filter((t) => !t.revokedAt)
                .map((t) => `${t.label}\0${t.blueprintIdentifier}`)
        ),
        [existingTokens]
    );

    const onClose = () => {
        dispatch(closeCreateDialog());
        resetForm();
    };

    const resetForm = () => {
        setLabel("");
        setBlueprintIdentifier("");
        reset();
    };

    const handleSubmit = async () => {
        try {
            const result = await createApiToken({ label, blueprintIdentifier }).unwrap();
            dispatch(closeCreateDialog());
            dispatch(openCreatedDialog(result));
            resetForm();
        } catch {
            // error is handled by the mutation hook
        }
    };

    const labelExists = label.trim().length > 0
        && blueprintIdentifier.length > 0
        && activeTokenLabels.has(`${label.trim()}\0${blueprintIdentifier}`);
    const isValid = label.trim().length > 0 && /^[a-z0-9\-_]+$/.test(blueprintIdentifier) && !labelExists;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            container={portalContainer.current}
        >
            <DialogTitle>
                Create API Token
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {mapApiErrorsToMessageString(error)}
                    </Alert>
                )}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
                    <TextField
                        label="Label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        fullWidth
                        required
                        error={labelExists}
                        helperText={labelExists
                            ? "A token with this label already exists for this blueprint"
                            : "A descriptive name for this token (e.g. 'CI/CD Pipeline')"}
                        slotProps={{ htmlInput: { maxLength: 100 } }}
                    />
                    <Autocomplete
                        freeSolo
                        options={identifierOptions}
                        value={blueprintIdentifier}
                        onInputChange={(_e, value) => setBlueprintIdentifier(value.toLowerCase())}
                        slotProps={{ popper: { container: portalContainer.current } }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Blueprint Identifier"
                                required
                                helperText="Lowercase alphanumeric, hyphens, underscores (e.g. 'my-blueprint')"
                                slotProps={{ htmlInput: { ...params.inputProps, maxLength: 64 } }}
                            />
                        )}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading || !isValid}
                >
                    {isLoading ? "Creating..." : "Create Token"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
