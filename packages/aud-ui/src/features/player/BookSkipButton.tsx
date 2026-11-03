import Forward30Icon from "@mui/icons-material/Forward30";
import Replay30Icon from "@mui/icons-material/Replay30";
import { IconButton } from "@mui/material";
import React from "react";
import { usePlayerCommand } from "./usePlayerCommand";
import { usePlayerPosition } from "./usePlayerPosition";

const SKIP_SEC = 30;

type BookSkipButtonProps = {
    direction: "back" | "forward";
    fontSize?: "medium" | "large";
};

/** Moves the place in the book 30 seconds back or forward. The server keeps the new place inside the track. */
export const BookSkipButton: React.FC<BookSkipButtonProps> = ({ direction, fontSize }) => {
    const send = usePlayerCommand();
    const position = usePlayerPosition();
    const back = direction === "back";
    return (
        <IconButton
            onClick={() => send("player_seek", { positionSec: position + (back ? -SKIP_SEC : SKIP_SEC) })}
            aria-label={back ? "Back 30 seconds" : "Forward 30 seconds"}
        >
            {back ? <Replay30Icon fontSize={fontSize} /> : <Forward30Icon fontSize={fontSize} />}
        </IconButton>
    );
};
