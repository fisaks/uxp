import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { UhnSystemSnapshot } from "@uhn/common";
import React from "react";

type RuntimeSectionProps = {
    runtime?: UhnSystemSnapshot["runtime"];
    busy: boolean;
    onStart: (e: React.MouseEvent) => void;
    onStop: (e: React.MouseEvent) => void;
    onRestart: (e: React.MouseEvent) => void;
};

export const RuntimeSection: React.FC<RuntimeSectionProps> = ({
    runtime,
    busy,
    onStart,
    onStop,
    onRestart,
}) => (
    <Box>
        <Typography variant="subtitle2">Runtime</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Chip
                size="small"
                label={runtime?.running ? "Running" : "Stopped"}
                color={runtime?.running ? "success" : "default"}
            />
            <Chip
                size="small"
                variant="outlined"
                label={runtime?.runMode === "debug" ? "Debug" : "Normal"}
            />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
            {runtime?.running ? (
                <>
                    <Button variant="contained" onClick={onRestart} disabled={busy}>
                        Restart runtime
                    </Button>
                    <Button variant="outlined" onClick={onStop} disabled={busy}>
                        Stop runtime
                    </Button>
                </>
            ) : (
                <Button variant="contained" onClick={onStart} disabled={busy}>
                    Start runtime
                </Button>
            )}
        </Stack>
    </Box>
);
