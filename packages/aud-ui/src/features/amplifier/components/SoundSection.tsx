import React from "react";
import { AmplifierInfo, AmplifierStatus } from "@aud/common";
import { Box, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, Switch, Typography } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { SendAmplifierCommand } from "../useAmplifierCommand";

type SoundSectionProps = {
    info: AmplifierInfo;
    status: AmplifierStatus;
    disabled: boolean;
    send: SendAmplifierCommand;
};

export const SoundSection: React.FC<SoundSectionProps> = ({ info, status, disabled, send }) => {
    // MUI menus are rendered in a portal, which has to be inside the Shadow DOM to keep its styles.
    const portalContainer = usePortalContainerRef();

    const switches = [
        { label: "Straight", checked: status.straight, onChange: (on: boolean) => send("amplifier_set_straight", { on }) },
        { label: "Enhancer", checked: status.enhancer, onChange: (on: boolean) => send("amplifier_set_enhancer", { on }) },
        { label: "Pure Direct", checked: status.pureDirect, onChange: (on: boolean) => send("amplifier_set_pure_direct", { on }) },
        // Adaptive DRC and CINEMA DSP 3D are Auto or Off on the amplifier
        { label: "Adaptive DRC", checked: status.adaptiveDrc, onChange: (on: boolean) => send("amplifier_set_adaptive_drc", { on }) },
        { label: "CINEMA DSP 3D", checked: status.cinemaDsp3d, onChange: (on: boolean) => send("amplifier_set_cinema_dsp_3d", { on }) },
    ];

    return (
        <Box>
            <Typography variant="subtitle1" gutterBottom>
                Sound
            </Typography>
            <FormControl fullWidth disabled={disabled}>
                <InputLabel id="sound-program-label">Sound program</InputLabel>
                <Select
                    labelId="sound-program-label"
                    label="Sound program"
                    value={info.soundPrograms.includes(status.soundProgram) ? status.soundProgram : ""}
                    onChange={(event) => send("amplifier_set_sound_program", { program: event.target.value })}
                    MenuProps={{ container: () => portalContainer.current }}
                >
                    {info.soundPrograms.map((program) => (
                        <MenuItem key={program} value={program}>
                            {program}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Stack direction="row" flexWrap="wrap" columnGap={3} sx={{ mt: 1 }}>
                {switches.map(({ label, checked, onChange }) => (
                    <FormControlLabel
                        key={label}
                        label={label}
                        control={<Switch checked={checked} disabled={disabled} onChange={(_event, on) => onChange(on)} />}
                    />
                ))}
            </Stack>
        </Box>
    );
};
