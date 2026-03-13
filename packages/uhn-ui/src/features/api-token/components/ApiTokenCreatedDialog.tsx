import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from "@mui/material";
import { copyToClipboard } from "@uxp/common";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../app/store";
import { selectCreatedDialog } from "../apiTokenSelector";
import { closeCreatedDialog } from "../apiTokenSlice";

export const ApiTokenCreatedDialog: React.FC = () => {
    const portalContainer = usePortalContainerRef();
    const dispatch = useAppDispatch();
    const { open, tokenData } = useSelector(selectCreatedDialog);
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

    const onClose = useCallback(() => {
        dispatch(closeCreatedDialog());
        setCopyStatus("idle");
    }, [dispatch]);

    const handleCopyToken = useCallback(async () => {
        if (!tokenData?.token) return;
        try {
            await copyToClipboard(tokenData.token);
            setCopyStatus("copied");
            setTimeout(() => setCopyStatus("idle"), 2000);
        } catch {
            setCopyStatus("failed");
        }
    }, [tokenData?.token]);

    const handleDownload = useCallback(() => {
        if (!tokenData) return;

        const config = {
            url: tokenData.url,
            identifier: tokenData.blueprintIdentifier,
            token: tokenData.token,
        };

        const blob = new Blob([JSON.stringify(config, null, 4)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${tokenData.blueprintIdentifier}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [tokenData]);

    if (!tokenData) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            container={portalContainer.current}
        >
            <DialogTitle>
                Token Created Successfully
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: "absolute", right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600}>
                        This is the only time the full token will be shown.
                    </Typography>
                    <Typography variant="body2">
                        Copy it or download the .uhn config file now. You will not be able to
                        retrieve the token again.
                    </Typography>
                </Alert>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Label
                    </Typography>
                    <Typography>{tokenData.label}</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Blueprint Identifier
                    </Typography>
                    <Typography fontFamily="monospace">
                        {tokenData.blueprintIdentifier}
                    </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Token
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <TextField
                            value={tokenData.token}
                            fullWidth
                            size="small"
                            slotProps={{
                                input: {
                                    readOnly: true,
                                    sx: { fontFamily: "monospace", fontSize: "0.85rem" },
                                },
                            }}
                        />
                        <TooltipIconButton onClick={handleCopyToken} tooltip="Copy token" tooltipPortal={portalContainer}>
                            <ContentCopyIcon />
                        </TooltipIconButton>
                    </Box>
                    <Typography
                        variant="caption"
                        color={copyStatus === "failed" ? "error.main" : "success.main"}
                        sx={{ visibility: copyStatus === "idle" ? "hidden" : "visible" }}
                    >
                        {copyStatus === "failed"
                            ? "Could not copy automatically. Please select the token text and copy it manually."
                            : "Copied to clipboard!"}
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                >
                    Download .uhn Config
                </Button>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
