import React from "react";
import { AmplifierInfo, AmplifierStatus } from "@aud/common";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { SendAmplifierCommand } from "../useAmplifierCommand";

type InputCardProps = {
    info: AmplifierInfo;
    status: AmplifierStatus;
    disabled: boolean;
    send: SendAmplifierCommand;
};

export const InputCard: React.FC<InputCardProps> = ({ info, status, disabled, send }) => (
    <Card>
        <CardContent>
            <Typography variant="h6" gutterBottom>
                Input
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
                {info.inputs.map((input) => (
                    <Chip
                        key={input.id}
                        label={input.label}
                        color={input.id === status.input ? "primary" : "default"}
                        variant={input.id === status.input ? "filled" : "outlined"}
                        disabled={disabled}
                        onClick={() => send("amplifier_set_input", { input: input.id })}
                    />
                ))}
            </Stack>
        </CardContent>
    </Card>
);
