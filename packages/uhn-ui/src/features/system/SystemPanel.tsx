import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    Switch,
    Typography
} from "@mui/material";
import { UhnSystemSnapshot, UhnSystemStatus } from "@uhn/common";
import React, { useEffect, useRef, useState } from "react";
import { useUHNSystemWebSocket } from "../../app/UHNSystemBrowserWebSocketManager";
import { ExecutionStatusPopover } from "./components/ExecutionStatusPopover";
import { QuickLinks } from "./components/QuickLinks";

const LOG_LEVELS: Array<{
    value: NonNullable<UhnSystemSnapshot["runtime"]["logLevel"]>;
    label: string;
}> = [
        { value: "error", label: "Error" },
        { value: "warn", label: "Warn" },
        { value: "info", label: "Info" },
        { value: "debug", label: "Debug" },
        { value: "trace", label: "Trace" },
    ];

type SystemPanelProps = {
    uhnStatus?: UhnSystemStatus;
    uhnSnapshot?: UhnSystemSnapshot;
};
export const SystemPanel: React.FC<SystemPanelProps> = ({ uhnStatus, uhnSnapshot }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const prevStateRef = useRef<UhnSystemStatus["state"] | undefined>(undefined);

    const { sendMessage } = useUHNSystemWebSocket();

    const busy = uhnStatus?.state === "running";

    useEffect(() => {
        const prevState = prevStateRef.current;
        const nextState = uhnStatus?.state;

        prevStateRef.current = nextState;

        if (!uhnStatus || nextState === "idle") {
            setPopoverOpen(false);
            return;
        }

        // 🔹 OPEN only when entering "running"
        if (nextState === "running" && prevState !== "running") {
            setPopoverOpen(true);
            return;
        }

        // 🔹 AUTO-CLOSE shortly after successful completion
        if (nextState === "completed" && prevState !== "completed") {
            const t = setTimeout(() => {
                setPopoverOpen(false);
            }, 3000);
            return () => clearTimeout(t);
        }

        // 🔹 ALWAYS show on failure (even if user closed it)
        if (nextState === "failed" && prevState !== "failed") {
            if (anchorEl) {
                setPopoverOpen(true);
            }
        }
        return;
    }, [uhnStatus, anchorEl]);


    const onToggleDebug = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAnchorEl(e.currentTarget);
        setPopoverOpen(true);
        sendMessage("uhn:system:command", { command: "setRunMode", payload: { runtimeMode: uhnSnapshot?.runtime.runMode === "debug" ? "normal" : "debug" } });
    };

    const setLogLevel = (
        level: NonNullable<UhnSystemSnapshot["runtime"]["logLevel"]>,
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        setAnchorEl(e.currentTarget.parentElement ?? e.currentTarget);
        setPopoverOpen(true);

        sendMessage("uhn:system:command", {
            command: "setLogLevel",
            payload: { logLevel: level },
        });
    };

    const restartRuntime = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget.parentElement ?? e.currentTarget);
        setPopoverOpen(true);
        sendMessage("uhn:system:command", { command: "restartRuntime", payload: {} });
    };

    const stopRuntime = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget.parentElement ?? e.currentTarget);
        setPopoverOpen(true);
        sendMessage("uhn:system:command", { command: "stopRuntime", payload: {} });
    };

    const startRuntime = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget.parentElement ?? e.currentTarget);
        setPopoverOpen(true);
        sendMessage("uhn:system:command", { command: "startRuntime", payload: {} });
    };

    const recompileBlueprint = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget.parentElement ?? e.currentTarget);
        setPopoverOpen(true);
        sendMessage("uhn:system:command", { command: "recompileBlueprint", payload: {} });
    };
    const setRunModeRunning = uhnStatus?.state === "running" && uhnStatus.command === "setRunMode";
    const setLogLevelRunning =
        uhnStatus?.state === "running" &&
        uhnStatus.command === "setLogLevel";

    return (
        <Box sx={{ p: 2, minWidth: 320 }}>
            <Typography variant="subtitle1">UHN System</Typography>

            {/* ---------------- Debug ---------------- */}
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Debug</Typography>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                    <Switch
                        checked={uhnSnapshot?.runtime.runMode === "debug"}
                        onChange={onToggleDebug}
                        disabled={busy}
                    />
                    {setRunModeRunning && (
                        <CircularProgress size={16} />
                    )}
                    {!setRunModeRunning && (
                        <Typography variant="body2">
                            Debug mode {uhnSnapshot?.runtime.runMode === "debug" ? "ON" : "OFF"}
                        </Typography>
                    )}
                </Stack>

                <Typography variant="caption" color="text.secondary">
                    {setRunModeRunning && "Updating runtime mode..."}
                    {!setRunModeRunning && uhnSnapshot?.runtime.runMode === "normal" && "Will restart runtime with source maps and debug port"}
                    {!setRunModeRunning && uhnSnapshot?.runtime.runMode === "debug" && "Debug port 9250 opened, runtime running with source maps"}
                </Typography>

            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ---------------- Runtime ---------------- */}
            <Box>
                <Typography variant="subtitle2">Runtime</Typography>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    <Chip
                        size="small"
                        label={uhnSnapshot?.runtime.running ? "Running" : "Stopped"}
                        color={uhnSnapshot?.runtime.running ? "success" : "default"}
                    />
                    <Chip
                        size="small"
                        variant="outlined"
                        label={uhnSnapshot?.runtime.runMode === "debug" ? "Debug" : "Normal"}
                    />
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
                    {uhnSnapshot?.runtime.running && (
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

                    {!uhnSnapshot?.runtime.running && (
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
            {/* ---------------- Logging ---------------- */}
            <Box>
                <Typography variant="subtitle2">Logging</Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                    {LOG_LEVELS.map(level => {
                        const active = uhnSnapshot?.runtime.logLevel === level.value;

                        return (
                            <Button
                                key={level.value}
                                size="small"
                                variant={active ? "contained" : "outlined"}
                                onClick={e => setLogLevel(level.value, e)}
                                disabled={busy || active}
                            >
                                {level.label}
                            </Button>
                        );
                    })}

                    {setLogLevelRunning && (
                        <CircularProgress size={16} />
                    )}
                </Stack>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Current log level:{" "}
                    <strong>{uhnSnapshot?.runtime.logLevel}</strong>
                </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* ---------------- Advanced ---------------- */}
            <Box>
                <Typography variant="subtitle2">Advanced</Typography>
                <Button
                    sx={{ mt: 1 }}
                    variant="outlined"
                    onClick={recompileBlueprint}
                    disabled={busy || !uhnSnapshot?.runtime.running}
                >
                    Recompile active blueprint
                </Button>
            </Box>

            {/* ---------------- Operation feedback ---------------- */}
            {uhnStatus && anchorEl && popoverOpen && uhnStatus.state !== "idle" && (
                <ExecutionStatusPopover
                    anchorEl={anchorEl}
                    status={uhnStatus}
                    onClose={() => setPopoverOpen(false)}
                />
            )}


            <Divider sx={{ my: 2 }} />

            {/* ---------------- Quick links ---------------- */}
            <QuickLinks />

        </Box>
    );
};


