import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Chip, FormControlLabel, IconButton, Switch, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { SmtpConfig } from "@uxp/common";
import { createDebouncedUpdater, Loading, ValidatedTextField } from "@uxp/ui-lib";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../hooks";
import { selectFullGlobalConfig } from "../../global-config/globalConfigSelectors";
import { fetchFullGlobalSettings, patchGlobalSetting } from "../../global-config/globalConfigThunk";
import { selectIsLoading } from "../../loading/loadingSelectors";
import axiosInstance from "../../../app/axiosInstance";

const defaultSmtp: SmtpConfig = {
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "",
};

const NotificationSettingsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const fullConfig = useSelector(selectFullGlobalConfig);
    const isPatching = useSelector(selectIsLoading("globalSettings/patch"));
    const isLoadingFull = useSelector(selectIsLoading("globalSettings/fetchFull"));
    const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

    const emailChannel = fullConfig?.notification?.email;

    const [enabled, setEnabled] = useState(emailChannel?.enabled ?? false);
    const [smtp, setSmtp] = useState<SmtpConfig>(emailChannel?.smtp ?? defaultSmtp);
    const [recipients, setRecipients] = useState<string[]>(emailChannel?.recipients ?? []);
    const [emailInput, setEmailInput] = useState("");
    const [passwordDirty, setPasswordDirty] = useState(false);

    useEffect(() => {
        dispatch(fetchFullGlobalSettings({}));
    }, []);

    // Sync local state when server data changes — use primitive deps to avoid stale references
    const serverEnabled = emailChannel?.enabled;
    const serverSmtpHost = emailChannel?.smtp?.host;
    const serverSmtpPort = emailChannel?.smtp?.port;
    const serverSmtpSecure = emailChannel?.smtp?.secure;
    const serverSmtpUser = emailChannel?.smtp?.user;
    const serverSmtpFrom = emailChannel?.smtp?.from;
    const serverRecipientCount = emailChannel?.recipients?.length;
    useEffect(() => {
        if (emailChannel) {
            setEnabled(emailChannel.enabled ?? false);
            setSmtp(emailChannel.smtp ?? defaultSmtp);
            setRecipients(emailChannel.recipients ?? []);
            setPasswordDirty(false);
        }
    }, [serverEnabled, serverSmtpHost, serverSmtpPort, serverSmtpSecure, serverSmtpUser, serverSmtpFrom, serverRecipientCount]);

    // TODO: Add per-field validation when migrated to RTK Query
    const [patchError, setPatchError] = useState<string | undefined>();

    const debouncedPatch = useMemo(
        () => createDebouncedUpdater({
            updateThunk: patchGlobalSetting,
            debounceWait: 1000,
            successHandler: () => setPatchError(undefined),
            errorHandler: () => setPatchError("Failed to save. Please try again."),
        }),
        []
    );

    const handleEnabledChange = useCallback(
        (value: boolean) => {
            setEnabled(value);
            debouncedPatch(dispatch, { key: "notification.email.enabled", value } );
        },
        [dispatch, debouncedPatch]
    );

    const handleSmtpChange = useCallback(
        (field: keyof SmtpConfig, value: string | number | boolean) => {
            // Update port locally when toggling secure (server also auto-sets it)
            if (field === "secure") {
                setSmtp((prev) => ({ ...prev, secure: value as boolean, port: value ? 465 : 587 }));
                debouncedPatch(dispatch, { key: `notification.email.smtp.${field}`, value } as never);
                return;
            }
            setSmtp((prev) => ({ ...prev, [field]: value }));
            if (field === "password" && !value) return;
            debouncedPatch(dispatch, { key: `notification.email.smtp.${field}`, value } as never);
        },
        [dispatch, debouncedPatch]
    );

    const [recipientSaving, setRecipientSaving] = useState(false);

    const handleAddRecipient = useCallback(() => {
        const trimmed = emailInput.trim();
        if (trimmed && !recipients.includes(trimmed)) {
            const next = [...recipients, trimmed];
            setRecipientSaving(true);
            dispatch(patchGlobalSetting({ key: "notification.email.recipients", value: next } ))
                .unwrap()
                .then(() => { setRecipients(next); setEmailInput(""); setPatchError(undefined); })
                .catch(() => setPatchError("Failed to add recipient."))
                .finally(() => setRecipientSaving(false));
        }
    }, [emailInput, recipients, dispatch]);

    const handleRemoveRecipient = useCallback(
        (email: string) => {
            const next = recipients.filter((e) => e !== email);
            setRecipientSaving(true);
            dispatch(patchGlobalSetting({ key: "notification.email.recipients", value: next } as never))
                .unwrap()
                .then(() => { setRecipients(next); setPatchError(undefined); })
                .catch(() => setPatchError("Failed to remove recipient."))
                .finally(() => setRecipientSaving(false));
        },
        [recipients, dispatch]
    );

    const handleSendTestEmail = useCallback(async () => {
        setTestEmailStatus("sending");
        try {
            await axiosInstance.post("/notifications/test-email");
            setTestEmailStatus("sent");
            setTimeout(() => setTestEmailStatus("idle"), 3000);
        } catch {
            setTestEmailStatus("error");
            setTimeout(() => setTestEmailStatus("idle"), 3000);
        }
    }, []);

    const reload = useCallback(() => {
        dispatch(fetchFullGlobalSettings({}));
    }, [dispatch]);

    if (isLoadingFull && !fullConfig) {
        return <Loading />;
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Typography variant="h2" component="h2">
                    Notification Settings
                </Typography>
                <Tooltip title={isLoadingFull ? "Refreshing..." : "Reload"}>
                    <span>
                        <IconButton aria-label="reload settings" onClick={reload} disabled={isLoadingFull} sx={{ color: theme.palette.primary.main }}>
                            {isLoadingFull ? <Loading size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {patchError && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>{patchError}</Typography>
            )}

            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2, maxWidth: 480 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="h3" component="h3">
                        Email Notifications
                    </Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={enabled}
                                onChange={(e) => handleEnabledChange(e.target.checked)}
                            />
                        }
                        label={enabled ? "Enabled" : "Disabled"}
                    />
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, opacity: enabled ? 1 : 0.5 }}>
                    <Typography variant="subtitle2">SMTP Configuration</Typography>
                    <TextField
                        label="SMTP Host"
                        value={smtp.host}
                        onChange={(e) => handleSmtpChange("host", e.target.value)}
                        size="small"
                        disabled={!enabled}
                    />
                    <TextField
                        label="Port"
                        type="number"
                        value={smtp.port}
                        onChange={(e) => handleSmtpChange("port", parseInt(e.target.value) || 587)}
                        size="small"
                        disabled={!enabled}
                    />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={smtp.secure}
                                onChange={(e) => handleSmtpChange("secure", e.target.checked)}
                                disabled={!enabled}
                            />
                        }
                        label="Use TLS (port 465)"
                    />
                    <TextField
                        label="Username"
                        value={smtp.user}
                        onChange={(e) => handleSmtpChange("user", e.target.value)}
                        size="small"
                        disabled={!enabled}
                    />
                    <ValidatedTextField<Record<string, string>>
                        label="Password"
                        name="password"
                        type="password"
                        value={passwordDirty ? smtp.password : ""}
                        onChange={(value) => {
                            if (!passwordDirty) setPasswordDirty(true);
                            handleSmtpChange("password", value);
                        }}
                        disabled={!enabled}
                        helperText={!passwordDirty && emailChannel?.smtp?.password ? "Password is configured. Type to replace." : undefined}
                    />
                    <TextField
                        label="From Address"
                        value={smtp.from}
                        onChange={(e) => handleSmtpChange("from", e.target.value)}
                        size="small"
                        disabled={!enabled}
                        placeholder='UXP Platform <noreply@example.com>'
                    />

                    <Typography variant="subtitle2" sx={{ mt: 1 }}>Recipients</Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {recipients.map((email) => (
                            <Chip key={email} label={email} onDelete={enabled && !recipientSaving ? () => handleRemoveRecipient(email) : undefined} />
                        ))}
                    </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                            label="Add email"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRecipient())}
                            size="small"
                            fullWidth
                            disabled={!enabled || recipientSaving}
                        />
                        <Button variant="outlined" onClick={handleAddRecipient} disabled={!enabled || !emailInput.trim() || recipientSaving}>
                            Add
                        </Button>
                    </Box>
                </Box>

                <Box sx={{ mt: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleSendTestEmail}
                        disabled={testEmailStatus === "sending" || !enabled || !smtp.host}
                    >
                        {testEmailStatus === "sending" ? "Sending..." :
                         testEmailStatus === "sent" ? "Sent!" :
                         testEmailStatus === "error" ? "Failed" :
                         "Send Test Email"}
                    </Button>
                    {isPatching && <Loading size={16} sx={{ ml: 1, display: "inline-flex", verticalAlign: "middle" }} />}
                </Box>
            </Box>
        </Box>
    );
};

export default NotificationSettingsPage;
