import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { GAIN_STEP_DB, MAX_GAIN_DB } from "@aud/common";
import { IconButton, Stack, Typography } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { selectCurrentTrack } from "./playerSelectors";
import { usePlayerCommand } from "./usePlayerCommand";

/** Shows how much louder than normal the song is played and makes it quieter or louder by a step, within 0 and the most it can be. */
export const GainButtons: React.FC = () => {
    const send = usePlayerCommand();
    const gainDb = useAppSelector(selectCurrentTrack)?.gainDb ?? 0;
    return (
        <Stack direction="row" alignItems="center">
            <IconButton
                size="small"
                aria-label="Quieter"
                disabled={gainDb <= 0}
                onClick={() => send("player_set_gain", { gainDb: gainDb - GAIN_STEP_DB })}
            >
                <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" aria-label={`${gainDb} dB louder than normal`} sx={{ minWidth: 56, textAlign: "center" }}>
                {gainDb > 0 ? `+${gainDb}` : gainDb} dB
            </Typography>
            <IconButton
                size="small"
                aria-label="Louder"
                disabled={gainDb >= MAX_GAIN_DB}
                onClick={() => send("player_set_gain", { gainDb: gainDb + GAIN_STEP_DB })}
            >
                <AddIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
};
