import { Box, Stack, Switch, TextField, Typography } from "@mui/material";
import { usePortalContainerRef, WithOptionalTooltip } from "@uxp/ui-lib";
import React, { useEffect, useState } from "react";

type DebugSectionProps = {
    runMode?: "debug" | "normal";
    debugPort?: number;
    showPortInput: boolean;
    busy: boolean;
    setRunModeRunning: boolean;
    onToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPortChange: (port: number, e: React.SyntheticEvent) => void;
};

export const DebugSection: React.FC<DebugSectionProps> = ({
    runMode,
    debugPort,
    showPortInput,
    busy,
    setRunModeRunning,
    onToggle,
    onPortChange,
}) => {
    const portalContainer = usePortalContainerRef();
    const [portValue, setPortValue] = useState(debugPort?.toString() ?? "");
    const [portError, setPortError] = useState(false);

    useEffect(() => {
        setPortValue(debugPort?.toString() ?? "");
        setPortError(false);
    }, [debugPort]);

    const isDebugOn = runMode === "debug";
    const portDisabled = isDebugOn || busy;

    const commitPort = (e: React.SyntheticEvent) => {
        const num = parseInt(portValue, 10);
        if (isNaN(num) || num < 1024 || num > 65535) {
            setPortError(true);
            return;
        }
        setPortError(false);
        if (num !== debugPort) {
            onPortChange(num, e);
        }
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Debug</Typography>

            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                <Switch
                    checked={isDebugOn}
                    onChange={onToggle}
                    disabled={busy}
                />
                {!setRunModeRunning && (
                    <Typography variant="body2">
                        Debug mode {isDebugOn ? "ON" : "OFF"}
                    </Typography>
                )}
                {showPortInput && (
                    <WithOptionalTooltip
                        tooltip={isDebugOn ? "Disable debug mode to change port" : undefined}
                        portalContainer={portalContainer}
                    >
                        <TextField
                            label="Port"
                            size="small"
                            type="number"
                            value={portValue}
                            onChange={e => {
                                setPortValue(e.target.value);
                                setPortError(false);
                            }}
                            onBlur={commitPort}
                            onKeyDown={e => {
                                if (e.key === "Enter") commitPort(e);
                            }}
                            disabled={portDisabled}
                            error={portError}
                            slotProps={{
                                htmlInput: {
                                    min: 1024,
                                    max: 65535,
                                    style: { padding: "2px 4px", fontSize: "0.75rem" }
                                },
                                inputLabel: { sx: { fontSize: "0.75rem" } }
                            }}
                            sx={{
                                width: 80,
                                pl: 2,
                                "& .MuiInputBase-root": { height: 28 }

                            }}
                        />
                    </WithOptionalTooltip>
                )}
            </Stack>

            <Typography variant="caption" color="text.secondary">
                {setRunModeRunning && "Updating runtime mode..."}
                {!setRunModeRunning && !isDebugOn &&
                    "Will restart runtime with source maps and debug port"}
                {!setRunModeRunning && isDebugOn &&
                    `Debug port ${debugPort ?? "?"} opened, runtime running with source maps`}
            </Typography>
        </Box>
    );
};
