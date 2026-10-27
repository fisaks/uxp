import { AmplifierStatus, SLEEP_TIMER_MINUTES } from "@aud/common";
import { Chip, Stack, Typography } from "@mui/material";
import React from "react";
import { SendAmplifierCommand } from "../useAmplifierCommand";

type SleepTimerRowProps = {
    status: AmplifierStatus;
    disabled: boolean;
    send: SendAmplifierCommand;
};

/** The chips of the sleep timer. The amplifier tells which one is set but not how much time is left. */
export const SleepTimerRow: React.FC<SleepTimerRowProps> = ({ status, disabled, send }) => (
    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
        <Typography color="text.secondary" sx={{ mr: 0.5 }}>
            Sleep timer
        </Typography>
        {SLEEP_TIMER_MINUTES.map((minutes) => (
            <Chip
                key={minutes}
                size="small"
                label={minutes === 0 ? "Off" : `${minutes} min`}
                color={minutes === status.sleepMinutes ? "primary" : "default"}
                variant={minutes === status.sleepMinutes ? "filled" : "outlined"}
                disabled={disabled}
                onClick={() => send("amplifier_set_sleep", { minutes })}
            />
        ))}
    </Stack>
);
