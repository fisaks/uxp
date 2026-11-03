import { Button } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { selectPlayerState } from "./playerSelectors";
import { usePlayerCommand } from "./usePlayerCommand";

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

/** Shows how fast the book is read and moves to the next speed in the list on each press, back to the slowest after the fastest. */
export const BookSpeedButton: React.FC = () => {
    const send = usePlayerCommand();
    const speed = useAppSelector(selectPlayerState)?.speed ?? 1;
    const next = SPEEDS.find((candidate) => candidate > speed) ?? SPEEDS[0];
    return (
        <Button
            size="small"
            color="inherit"
            onClick={() => send("player_set_speed", { rate: next })}
            aria-label={`Speed ${speed} times, press to change to ${next} times`}
            sx={{ minWidth: 56 }}
        >
            {speed}×
        </Button>
    );
};
