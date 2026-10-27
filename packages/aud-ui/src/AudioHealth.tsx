import { HealthItem } from "@uxp/common";
import { getUxpWindow, WebSocketProvider } from "@uxp/ui-lib";
import { AmplifierReachability, AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import React, { useCallback, useEffect, useMemo } from "react";
import {
    AudioAppErrorHandler,
    AudioAppWebSocketResponseListener,
    AudioHealthBrowserWebSocketManager,
} from "./app/AudioBrowserWebSocketManager";

const APP_ID = "aud";
const CHECK_INTERVAL_MS = 30_000;
// The first check waits until the connection through the UXP proxy has settled, as the page does before it subscribes.
const FIRST_CHECK_DELAY_MS = 500;

const AUDIO_SERVER_ERROR: HealthItem = {
    id: "audio-server",
    severity: "error",
    message: "The audio server cannot be reached",
};
const AUDIO_SERVER_OK: HealthItem = { id: "audio-server", severity: "ok", message: "The audio server is running" };
const AMPLIFIER_ERROR: HealthItem = { id: "amplifier", severity: "error", message: "The amplifier cannot be reached" };
const AMPLIFIER_OK: HealthItem = { id: "amplifier", severity: "ok", message: "The amplifier is reachable" };

// The page only asks questions; a failed check is what it reports, so there is nothing to listen to or to handle.
const NO_LISTENERS: AudioAppWebSocketResponseListener = {};
const IGNORE_ERROR: AudioAppErrorHandler = () => true;

/**
 * Asks the audio server every 30 seconds whether it and the amplifier answer, and reports it to UXP. The server cannot
 * report its own death, so a check that gets no answer is what tells that it is down; the amplifier is then not known.
 * The first check is made when the connection opens (and again after a reconnect), since a message cannot be sent before.
 * The items have no timestamp, so UXP only shows a notice when a severity or a message changes.
 */
const AudioHealth: React.FC = () => {
    const ws = useMemo(() => AudioHealthBrowserWebSocketManager.getInstance(), []);

    const check = useCallback(async () => {
        const report = (items: HealthItem[]) =>
            getUxpWindow()?.signal.health({ appId: APP_ID, items, updatedAt: new Date().toISOString() });
        try {
            const { payload } = await ws.sendMessageAsync({ action: "amplifier_check", payload: {} });
            report([AUDIO_SERVER_OK, (payload as AmplifierReachability | undefined)?.reachable ? AMPLIFIER_OK : AMPLIFIER_ERROR]);
        } catch {
            report([AUDIO_SERVER_ERROR]);
        }
    }, [ws]);

    const checkSoon = useCallback(() => {
        setTimeout(check, FIRST_CHECK_DELAY_MS);
    }, [check]);

    useEffect(() => {
        const timer = setInterval(check, CHECK_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [check]);

    return (
        <WebSocketProvider<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap>
            wsInstance={ws}
            listeners={NO_LISTENERS}
            onError={IGNORE_ERROR}
            onConnect={checkSoon}
        >
            {null}
        </WebSocketProvider>
    );
};

export default AudioHealth;
