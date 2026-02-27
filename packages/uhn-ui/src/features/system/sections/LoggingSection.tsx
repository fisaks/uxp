import { Box, Button, Typography } from "@mui/material";
import { UhnLogLevel } from "@uhn/common";
import React from "react";

const LOG_LEVELS = [
    { value: "error", label: "Error" },
    { value: "warn", label: "Warn" },
    { value: "info", label: "Info" },
    { value: "debug", label: "Debug" },
    { value: "trace", label: "Trace" },
] as const;

type LoggingSectionProps = {
    logLevel?: UhnLogLevel;
    busy: boolean;
    onSetLevel: (level: UhnLogLevel, e: React.MouseEvent) => void;
};

export const LoggingSection: React.FC<LoggingSectionProps> = ({
    logLevel,
    busy,
    onSetLevel,
}) => (
    <Box>
        <Typography variant="subtitle2">Logging</Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
            {LOG_LEVELS.map(level => {
                const active = logLevel === level.value;
                return (
                    <Button
                        key={level.value}
                        size="small"
                        variant={active ? "contained" : "outlined"}
                        disabled={busy || active}
                        onClick={e => onSetLevel(level.value, e)}
                    >
                        {level.label}
                    </Button>
                );
            })}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Current log level: <strong>{logLevel}</strong>
        </Typography>
    </Box>
);
