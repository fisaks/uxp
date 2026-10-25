import { AmplifierInfo, AmplifierStatus } from "@aud/common";
import { Box, Stack, Typography } from "@mui/material";
import React from "react";
import { SendAmplifierCommand } from "../useAmplifierCommand";
import { SettingSlider } from "./SettingSlider";

type ToneSectionProps = {
    info: AmplifierInfo;
    status: AmplifierStatus;
    disabled: boolean;
    send: SendAmplifierCommand;
};

const formatDb = (db: number) => `${db > 0 ? "+" : ""}${db} dB`;

export const ToneSection: React.FC<ToneSectionProps> = ({ info, status, disabled, send }) => (
    <Box>
        <Typography variant="subtitle1" gutterBottom>
            Tone
        </Typography>
        <Stack spacing={1}>
            <SettingSlider
                label="Bass"
                value={status.bass}
                min={info.bass.min}
                max={info.bass.max}
                step={info.bass.step}
                format={formatDb}
                disabled={disabled}
                onSend={(db) => send("amplifier_set_bass", { db })}
            />
            <SettingSlider
                label="Treble"
                value={status.treble}
                min={info.treble.min}
                max={info.treble.max}
                step={info.treble.step}
                format={formatDb}
                disabled={disabled}
                onSend={(db) => send("amplifier_set_treble", { db })}
            />
            <SettingSlider
                label="Subwoofer trim"
                value={status.subwooferTrim}
                min={info.subwooferTrim.min}
                max={info.subwooferTrim.max}
                step={info.subwooferTrim.step}
                format={formatDb}
                disabled={disabled}
                onSend={(db) => send("amplifier_set_subwoofer_trim", { db })}
            />
        </Stack>
        <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
            Dialogue
        </Typography>
        <Stack spacing={1}>
            <SettingSlider
                label="Level"
                value={status.dialogueLevel}
                min={info.dialogueLevel.min}
                max={info.dialogueLevel.max}
                step={info.dialogueLevel.step}
                format={String}
                disabled={disabled}
                onSend={(level) => send("amplifier_set_dialogue_level", { level })}
            />
            <SettingSlider
                label="Lift"
                value={status.dialogueLift}
                min={info.dialogueLift.min}
                max={info.dialogueLift.max}
                step={info.dialogueLift.step}
                format={String}
                disabled={disabled}
                onSend={(level) => send("amplifier_set_dialogue_lift", { level })}
            />
        </Stack>
    </Box>
);
