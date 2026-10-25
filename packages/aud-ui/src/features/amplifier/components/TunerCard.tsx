import React from "react";
import { AmplifierInfo, AmplifierTuner } from "@aud/common";
import { Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { SendAmplifierCommand } from "../useAmplifierCommand";

type TunerCardProps = {
    info: AmplifierInfo;
    tuner: AmplifierTuner;
    disabled: boolean;
    send: SendAmplifierCommand;
};

export const TunerCard: React.FC<TunerCardProps> = ({ info, tuner, disabled, send }) => {
    const program = [tuner.programService, tuner.programType && `(${tuner.programType})`, tuner.radioText].filter(Boolean).join(" ");

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Tuner
                </Typography>
                <Typography>
                    {tuner.band} {tuner.frequency}
                </Typography>
                {program && <Typography color="text.secondary">{program}</Typography>}
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                    {info.tunerPresets.map((preset) => (
                        <Chip
                            key={preset.id}
                            label={preset.title}
                            color={preset.id === tuner.presetId ? "primary" : "default"}
                            variant={preset.id === tuner.presetId ? "filled" : "outlined"}
                            disabled={disabled}
                            onClick={() => send("amplifier_set_tuner_preset", { preset: preset.id })}
                        />
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );
};
