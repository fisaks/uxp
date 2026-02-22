import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import HistoryIcon from "@mui/icons-material/History";
import { Alert, Button, Checkbox, FormControlLabel, IconButton, Paper, Typography, useTheme } from "@mui/material";
import Box from "@mui/material/Box/Box";
import { BlueprintUploadResponse } from "@uhn/common";
import { ErrorCodeMessageMap, FormattedMessageType, ReloadIconButton, UploadProgress, UploadStatus, useUploadTracker } from "@uxp/ui-lib";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../app/store";
import { selectActionError, selectActionIsLoading } from "../../loading-error/loadingErrorSlice";
import { uploadBlueprint } from "../../upload/multipartUpload";
import { selectBlueprintTrackingId } from "../blueprintSelector";
import { openActivationListDialog, setBlueprintTrackingId } from "../blueprintSlice";

import { uhnApi } from "../../../app/uhnApi";
import { useActivateBlueprintMutation, useFetchBlueprintsQuery } from "../blueprint.api";
import BlueprintActivationListDialog from "../components/BlueprintActivationListDialog";
import BlueprintList from "../components/BlueprintList";
import { BlueprintVersionLogDialog } from "../components/BlueprintVersionLogDialog";


const ErrorMessage: ErrorCodeMessageMap = {
    'NO_FILES_UPLOADED': "No blueprint file was uploaded.",
    'INVALID_FILE_TYPE': "Only zip files are allowed for blueprint uploads.",
    'ONLY_SINGLE_FILE_ALLOWED': "Only a single blueprint file can be uploaded at a time.",
    'FILE_TOO_LARGE': "The uploaded blueprint file exceeds the maximum allowed size.",
}


export const UploadBlueprintPage = () => {
    const uploadTracker = useUploadTracker(uploadBlueprint);
    const [file, setFile] = useState<File | null>(null);
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const [uploadStatus, setUploadStatus] = useState<UploadStatus<BlueprintUploadResponse> | undefined>(undefined);
    const blueprintsLoading = useSelector(selectActionIsLoading("blueprint/fetchBlueprints"));
    const blueprintsError = useSelector(selectActionError("blueprint/fetchBlueprints"));
    const [error, setError] = useState<string | undefined>(undefined);
    const [successMessage, setSuccessMessage] = useState<FormattedMessageType | undefined>(undefined);
    const [activateAfterUpload, setActivateAfterUpload] = useState(true);
    const [activateBlueprint] = useActivateBlueprintMutation();
    // Keep trackingId in Redux for cross-page tracking, but useRef here to avoid
    // resubscribing the uploadTracker listener on every Redux change.
    const trackingId = useRef<string | undefined>(useSelector(selectBlueprintTrackingId));
    const { refetch: loadBlueprints } = useFetchBlueprintsQuery();

    const showActivationList = useCallback(() => {
        dispatch(openActivationListDialog(undefined));
    }, [dispatch]);


    useEffect(() => {
        if (successMessage) dispatch(uhnApi.util.invalidateTags(['Blueprints', 'BlueprintActivations']));
    }, [dispatch, successMessage]);
    useEffect(() => {
        const unsub = uploadTracker.subscribeToUploadStatus<BlueprintUploadResponse>((id, status) => {
            if (id !== trackingId.current) return;
            setUploadStatus(status);
        })
        return () => {
            unsub();
        };
    }, [uploadTracker])

    // React to uploadStatus changes — handle success messages and optional activation.
    const activatedForRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (!uploadStatus) return;
        if (uploadStatus.status === "uploading") {
            setError(undefined);
            setSuccessMessage(undefined);
            return;
        }
        if (uploadStatus.status !== "done" || !uploadStatus.result) return;

        const { identifier, version } = uploadStatus.result;

        if (!activateAfterUpload) {
            setSuccessMessage({
                template: "Blueprint uploaded successfully. Identifier: {identifier}, version {version}.",
                values: { identifier, version }
            });
            return;
        }

        const key = `${identifier}@${version}`;
        if (activatedForRef.current === key) return;
        activatedForRef.current = key;

        setSuccessMessage({
            template: "Blueprint uploaded. Activating {identifier} v{version}…",
            values: { identifier, version }
        });
        activateBlueprint({ identifier, version })
            .unwrap()
            .then(() => {
                setSuccessMessage({
                    template: "Blueprint uploaded and activated. Identifier: {identifier}, version {version}.",
                    values: { identifier, version }
                });
            })
            .catch(() => {
                setError("Blueprint uploaded but activation failed.");
                setSuccessMessage({
                    template: "Blueprint uploaded. Identifier: {identifier}, version {version}.",
                    values: { identifier, version }
                });
            });
    }, [uploadStatus, activateAfterUpload, activateBlueprint])


    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setUploadStatus(undefined);
        setError(undefined);
        setSuccessMessage(undefined);
        const selectedFile = event.target.files?.[0] ?? null;
        if (!selectedFile) {
            setFile(null);
            return;
        }

        if (selectedFile.type !== "application/zip" && !selectedFile.name.endsWith(".zip")) {
            setError("Only .zip files are allowed.");
            setFile(null);
            return;
        }

        setFile(selectedFile);
    };

    const handleSubmit = async (event?: FormEvent) => {
        event?.preventDefault();
        setUploadStatus(undefined);
        if (!file) {
            setError("Please select a blueprint .zip file to upload.");
            return;
        }
        const tracking = uploadTracker.startUpload(file);
        trackingId.current = tracking.id;

        dispatch(setBlueprintTrackingId(tracking.id));

    };
    const isSubmitting = uploadStatus?.status === "uploading";
    return (
        <Box >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h1">Upload Blueprint</Typography>

            </Box>

            <Paper
                elevation={3}
                sx={{
                    mt: 3,
                    p: 3,
                    maxWidth: 600,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <Typography variant="body1">
                    Select a blueprint <strong>.zip</strong> file and upload it to UHN Master.
                </Typography>

                {error && (
                    <Alert severity="error" onClose={() => setError(undefined)}>
                        {error}
                    </Alert>
                )}

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                    <Button
                        variant="outlined"
                        component="label"
                        startIcon={<CloudUploadIcon />}
                        disabled={isSubmitting}
                        sx={{ alignSelf: "flex-start" }}
                    >
                        {file ? "Change file" : "Choose blueprint .zip"}
                        <input
                            type="file"
                            hidden
                            accept=".zip,application/zip"
                            onChange={handleFileChange}
                        />
                    </Button>

                    {file && (
                        <Typography variant="body2" color="text.secondary">
                            Selected file: <strong>{file.name}</strong>
                        </Typography>
                    )}

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={activateAfterUpload}
                                onChange={(e) => setActivateAfterUpload(e.target.checked)}
                                disabled={isSubmitting}
                            />
                        }
                        label="Activate after upload"
                    />

                    <Box sx={{ mt: 2 }}>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={!file || isSubmitting}
                        >
                            {isSubmitting ? "Uploading…" : "Upload Blueprint"}
                        </Button>
                    </Box>
                </Box>
                <UploadProgress uploadStatus={uploadStatus} successMessage={successMessage} errorCodeMessageMap={ErrorMessage}
                    onCancel={() => {
                        if (uploadStatus) {
                            uploadTracker.cancelUpload(uploadStatus.id);
                        }
                    }} onRetry={file ? () => handleSubmit() : undefined} />
            </Paper>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 3 }}>
                <Typography variant="h2">Uploaded Blueprints</Typography>
                <ReloadIconButton isLoading={blueprintsLoading} reload={loadBlueprints} />
                <IconButton onClick={showActivationList} title="View Activation History"
                    sx={{ color: theme.palette.primary.main }}                    >
                    <HistoryIcon />
                </IconButton>
            </Box>
            <Paper
                elevation={3}
                sx={{
                    mt: 2,
                    p: 3,
                    maxWidth: 1200,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >

                <BlueprintList maxVersionsToShow={5} isLoading={blueprintsLoading}
                    error={blueprintsError ? "An error occurred while fetching blueprints" : undefined} />
            </Paper>
            <BlueprintActivationListDialog />
            <BlueprintVersionLogDialog />

        </Box>

    );
}