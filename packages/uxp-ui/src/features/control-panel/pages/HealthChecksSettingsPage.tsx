import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, FormControlLabel, IconButton, Switch, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { TlsCertCheckConfig } from "@uxp/common";
import { createDebouncedUpdater, Loading } from "@uxp/ui-lib";
import axiosInstance from "../../../app/axiosInstance";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../../hooks";
import { selectFullGlobalConfig } from "../../global-config/globalConfigSelectors";
import { fetchFullGlobalSettings, patchGlobalSetting } from "../../global-config/globalConfigThunk";
import { healthSnapshotReceived } from "../../header/healthSlice";
import { selectIsLoading } from "../../loading/loadingSelectors";

const defaultTlsCert: TlsCertCheckConfig = {
    enabled: false,
    domain: "",
    warnDays: 14,
    errorDays: 7,
    intervalHours: 6,
};

const HealthChecksSettingsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useTheme();
    const fullConfig = useSelector(selectFullGlobalConfig);
    const isPatching = useSelector(selectIsLoading("globalSettings/patch"));
    const isLoadingFull = useSelector(selectIsLoading("globalSettings/fetchFull"));

    const healthChecks = fullConfig?.healthChecks;
    const [tlsCert, setTlsCert] = useState<TlsCertCheckConfig>(healthChecks?.tlsCert ?? defaultTlsCert);

    useEffect(() => {
        dispatch(fetchFullGlobalSettings({}));
    }, []);

    useEffect(() => {
        setTlsCert({ ...defaultTlsCert, ...healthChecks?.tlsCert });
    }, [fullConfig]);

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

    const handleTlsChange = useCallback(
        (field: keyof TlsCertCheckConfig, value: string | number | boolean) => {
            setTlsCert((prev) => ({ ...prev, [field]: value }));
            debouncedPatch(dispatch, { key: `healthChecks.tlsCert.${field}`, value } as never);
        },
        [dispatch, debouncedPatch]
    );

    const reload = useCallback(() => {
        dispatch(fetchFullGlobalSettings({}));
    }, [dispatch]);

    const [recheckStatus, setRecheckStatus] = useState<"idle" | "checking">("idle");
    const [recheckResult, setRecheckResult] = useState<string | undefined>();

    const handleRecheck = useCallback(async () => {
        setRecheckStatus("checking");
        setRecheckResult(undefined);
        try {
            const response = await axiosInstance.post("/platform-health/recheck/tls-cert");
            const snapshot = response.data;
            if (snapshot?.appId) {
                dispatch(healthSnapshotReceived(snapshot));
            }
            const item = snapshot?.items?.find((i: { id: string }) => i.id === "tls-cert");
            setRecheckResult(item?.message);
        } catch {
            setRecheckResult("Recheck failed");
        } finally {
            setRecheckStatus("idle");
        }
    }, [dispatch]);

    if (isLoadingFull && !fullConfig) {
        return <Loading />;
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Typography variant="h2" component="h2">
                    Health Check Settings
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
                        TLS Certificate
                    </Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={tlsCert.enabled}
                                onChange={(e) => handleTlsChange("enabled", e.target.checked)}
                            />
                        }
                        label={tlsCert.enabled ? "Enabled" : "Disabled"}
                    />
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, opacity: tlsCert.enabled ? 1 : 0.5 }}>
                    <TextField
                        label="Domain"
                        value={tlsCert.domain}
                        onChange={(e) => handleTlsChange("domain", e.target.value)}
                        size="small"
                        disabled={!tlsCert.enabled}
                        placeholder="Uses DOMAIN_NAME env var if empty"
                    />
                    <TextField
                        label="Warning threshold (days)"
                        type="number"
                        value={tlsCert.warnDays}
                        onChange={(e) => handleTlsChange("warnDays", parseInt(e.target.value) || 14)}
                        size="small"
                        disabled={!tlsCert.enabled}
                    />
                    <TextField
                        label="Error threshold (days)"
                        type="number"
                        value={tlsCert.errorDays}
                        onChange={(e) => handleTlsChange("errorDays", parseInt(e.target.value) || 7)}
                        size="small"
                        disabled={!tlsCert.enabled}
                    />
                    <TextField
                        label="Check interval (hours)"
                        type="number"
                        value={tlsCert.intervalHours}
                        onChange={(e) => handleTlsChange("intervalHours", parseInt(e.target.value) || 6)}
                        size="small"
                        disabled={!tlsCert.enabled}
                    />
                </Box>

                <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
                    <Button
                        variant="outlined"
                        size="small"
                        disabled={!tlsCert.enabled || recheckStatus === "checking"}
                        onClick={handleRecheck}
                    >
                        {recheckStatus === "checking" ? "Checking..." : "Check Now"}
                    </Button>
                    {recheckResult && (
                        <Typography variant="body2" color="text.secondary">{recheckResult}</Typography>
                    )}
                    {isPatching && <Loading size={16} />}
                </Box>
            </Box>
        </Box>
    );
};

export default HealthChecksSettingsPage;
