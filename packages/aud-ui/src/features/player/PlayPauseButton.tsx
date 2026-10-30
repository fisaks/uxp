import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { CircularProgress, IconButton } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { selectPlayerState } from "./playerSelectors";
import { usePlayerCommand } from "./usePlayerCommand";

/** Play, pause, or while the sound is being made ready a spinner, and pressing it then cancels. */
export const PlayPauseButton: React.FC = () => {
    const state = useAppSelector(selectPlayerState);
    const send = usePlayerCommand();
    const playing = state?.status === "playing";
    // The amplifier may be starting up and the file loading: the position does not move until the sound is there.
    const loading = state?.status === "starting";
    return (
        <IconButton
            color="primary"
            size="large"
            onClick={() => send(playing || loading ? "player_pause" : "player_resume", {})}
            aria-label={loading ? "Loading, press to cancel" : playing ? "Pause" : "Play"}
        >
            {loading ? <CircularProgress size={35} /> : playing ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
        </IconButton>
    );
};
