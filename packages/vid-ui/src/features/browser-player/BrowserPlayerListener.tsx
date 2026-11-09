import React, { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { browserPlayerGone, browserPlayerReceived } from "./browserPlayerSlice";
import { selectBrowserPlayerReceivedAt } from "./browserPlayerSelectors";
import {
    FromPlayerMessage,
    nameMainWindow,
    openChannel,
    PLAYER_PING_MS,
    PLAYER_STALE_MS,
    takePendingCommand,
    ToPlayerMessage,
} from "./browserPlayerLink";

/**
 * Keeps the state of the player tab in the store. It asks the tab for its state at a steady pace and takes the tab as gone when
 * it does not answer, and gives a tab that has just been opened the command it was opened for.
 */
export const BrowserPlayerListener: React.FC = () => {
    const dispatch = useAppDispatch();
    const receivedAt = useRef(0);
    receivedAt.current = useAppSelector(selectBrowserPlayerReceivedAt);

    useEffect(nameMainWindow, []);

    useEffect(() => {
        const channel = openChannel();
        const send = (message: ToPlayerMessage) => channel.postMessage(message);
        channel.onmessage = ({ data }: MessageEvent<FromPlayerMessage>) => {
            if (data.type === "state") dispatch(browserPlayerReceived(data.state));
            else if (data.type === "closed") dispatch(browserPlayerGone());
            else if (data.type === "ready") {
                const command = takePendingCommand();
                if (command) send({ type: "command", command });
            }
        };
        send({ type: "ping" });
        const timer = setInterval(() => {
            if (Date.now() - receivedAt.current > PLAYER_STALE_MS) dispatch(browserPlayerGone());
            send({ type: "ping" });
        }, PLAYER_PING_MS);
        return () => {
            clearInterval(timer);
            channel.close();
        };
    }, [dispatch]);

    return null;
};
