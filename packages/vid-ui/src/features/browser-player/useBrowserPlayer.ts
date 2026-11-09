import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { clipsQueued } from "../cast/castSlice";
import { queuedText } from "../cast/castText";
import { BrowserPlayerCommand, postToPlayer, PLAYER_WINDOW_NAME, playerWindowUrl, setPendingCommand } from "./browserPlayerLink";
import { selectBrowserPlayer } from "./browserPlayerSelectors";

/** Brings the player tab to the front without loading it again. A window name that is new opens an empty tab. */
const showPlayerWindow = () => window.open("", PLAYER_WINDOW_NAME)?.focus();

/** The player tab: where it is, and the commands to it. */
export const useBrowserPlayer = () => {
    const dispatch = useAppDispatch();
    const player = useAppSelector(selectBrowserPlayer);
    const exists = player !== undefined;

    /**
     * Asks the tab to do it. Without a tab one is opened and given the command when it is ready, so this has to be called straight
     * from a click, or the browser does not allow the tab to open.
     */
    const send = useCallback(
        (command: Extract<BrowserPlayerCommand, { action: "replace" | "next" | "append" }>) => {
            if (exists) {
                postToPlayer(command);
                showPlayerWindow();
            } else {
                setPendingCommand(command);
                window.open(playerWindowUrl(), PLAYER_WINDOW_NAME);
            }
            dispatch(clipsQueued({ clipIds: command.clipIds, text: `${queuedText(command.action)} in the player tab` }));
        },
        [exists, dispatch]
    );

    return { player, send, show: showPlayerWindow };
};
