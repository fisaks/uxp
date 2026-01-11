import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Link,
    Stack,
    Switch,
    Typography,
} from "@mui/material";
import { getUxpWindow } from "@uxp/ui-lib";
import React, { useState } from "react";
import { QuickLinks } from "./components/QuickLinks";

export const SystemPanel: React.FC = () => {
    // --- mocked system state ---
    const [runtimeState, setRuntimeState] = useState<"running" | "stopped">("running");
    const [profile, setProfile] = useState<"normal" | "debug">("normal");

    const [operation, setOperation] = useState<{
        label: string;
        status: "idle" | "running" | "success" | "error";
        message?: string;
    } | null>(null);

    const busy = operation?.status === "running";

    // --- mocked actions ---
    const runOperation = (label: string, fn: () => void) => {
        setOperation({ label, status: "running" });
        setTimeout(() => {
            fn();
            setOperation({ label, status: "success", message: "Completed successfully" });
        }, 2000);
    };

    const toggleDebug = () => {
        runOperation(
            profile === "debug" ? "Switching to normal mode" : "Switching to debug mode",
            () => setProfile(profile === "debug" ? "normal" : "debug")
        );
    };

    const restartRuntime = () => {
        runOperation("Restarting runtime", () => {
            setRuntimeState("running");
        });
    };

    const stopRuntime = () => {
        runOperation("Stopping runtime", () => {
            setRuntimeState("stopped");
        });
    };

    const startRuntime = () => {
        runOperation("Starting runtime", () => {
            setRuntimeState("running");
        });
    };

    const recompileBlueprint = () => {
        runOperation("Recompiling active blueprint", () => { });
    };

    return (
        <Box sx={{ p: 2, minWidth: 320 }}>
            <Typography variant="subtitle1">UHN System</Typography>

            {/* ---------------- Debug ---------------- */}
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Debug</Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                    <Switch
                        checked={profile === "debug"}
                        onChange={toggleDebug}
                        disabled={busy}
                    />
                    <Typography variant="body2">
                        Debug mode {profile === "debug" ? "ON" : "OFF"}
                    </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                    Restart runtime with source maps and debug port
                </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ---------------- Runtime ---------------- */}
            <Box>
                <Typography variant="subtitle2">Runtime</Typography>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                        size="small"
                        label={runtimeState === "running" ? "Running" : "Stopped"}
                        color={runtimeState === "running" ? "success" : "default"}
                    />
                    <Chip
                        size="small"
                        variant="outlined"
                        label={profile === "debug" ? "Debug" : "Normal"}
                    />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
                    {runtimeState === "running" && (
                        <>
                            <Button
                                variant="contained"
                                onClick={restartRuntime}
                                disabled={busy}
                            >
                                Restart runtime
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={stopRuntime}
                                disabled={busy}
                            >
                                Stop runtime
                            </Button>
                        </>
                    )}

                    {runtimeState === "stopped" && (
                        <Button
                            variant="contained"
                            onClick={startRuntime}
                            disabled={busy}
                        >
                            Start runtime
                        </Button>
                    )}
                </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ---------------- Advanced ---------------- */}
            <Box>
                <Typography variant="subtitle2">Advanced</Typography>
                <Button
                    sx={{ mt: 1 }}
                    variant="outlined"
                    onClick={recompileBlueprint}
                    disabled={busy || runtimeState !== "running"}
                >
                    Recompile active blueprint
                </Button>
            </Box>

            {/* ---------------- Operation feedback ---------------- */}
            {operation && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Box>
                        <Typography variant="subtitle2">Last action</Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                            {operation.status === "running" && (
                                <CircularProgress size={16} />
                            )}
                            <Typography variant="body2">
                                {operation.label}
                            </Typography>
                        </Stack>
                        {operation.message && (
                            <Typography variant="caption" color="text.secondary">
                                {operation.message}
                            </Typography>
                        )}
                    </Box>
                </>
            )}

            <Divider sx={{ my: 2 }} />

            {/* ---------------- Quick links ---------------- */}
            <QuickLinks />

        </Box>
    );
};


