import { HealthItem } from "@uxp/common";
import { getUxpWindow, WebSocketProvider } from "@uxp/ui-lib";
import { AmplifierReachability, AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap, SearchReachability, SpotifyHealth } from "@aud/common";
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
const SEARCH_ERROR: HealthItem = { id: "search", severity: "error", message: "Search cannot be reached" };
const SEARCH_OK: HealthItem = { id: "search", severity: "ok", message: "Search is running" };

const SPOTIFY_ERROR: HealthItem = { id: "spotify", severity: "error", message: "Spotify cannot be reached" };
const SPOTIFY_OK: HealthItem = { id: "spotify", severity: "ok", message: "Spotify is running" };
const DAY_MS = 24 * 3600 * 1000;
// The monthly update and its retries leave a gap of at most a month and a few hours.
const UPDATE_STALE_DAYS = 45;
const BUILD_WARN_DAYS = 30;
const BUILD_ERROR_DAYS = 7;

/**
 * A Spotify build stops working 90 days after it is made, and a monthly update installs a newer one. The item turns to a warning
 * when updates stop being made, well before the build runs out, so there is time to look at the Pi.
 */
const spotifyItem = ({ reachable, houseReachable, expiresAt, lastUpdateAt, catalog }: SpotifyHealth, now = Date.now()): HealthItem => {
    const daysLeft = expiresAt ? Math.floor((Date.parse(expiresAt) - now) / DAY_MS) : undefined;
    if (daysLeft !== undefined && daysLeft < 0) {
        return { ...SPOTIFY_ERROR, message: "The Spotify build has expired: it must be updated on the Pi" };
    }
    if (!reachable) {
        return SPOTIFY_ERROR;
    }
    if (!houseReachable) {
        return { ...SPOTIFY_ERROR, message: "The house Spotify player cannot be reached: Spotify tracks of the queue cannot be played" };
    }
    if (daysLeft !== undefined && daysLeft <= BUILD_WARN_DAYS) {
        const severity = daysLeft <= BUILD_ERROR_DAYS ? "error" : "warn";
        return { id: "spotify", severity, message: `Spotify stops working in ${daysLeft} days: the update has not worked` };
    }
    const staleDays = lastUpdateAt ? Math.floor((now - Date.parse(lastUpdateAt)) / DAY_MS) : undefined;
    if (staleDays !== undefined && staleDays > UPDATE_STALE_DAYS) {
        return { id: "spotify", severity: "warn", message: `Spotify has not been updated for ${staleDays} days` };
    }
    if (catalog.enabled && !catalog.ok) {
        return { id: "spotify", severity: "warn", message: "Spotify plays, but its search does not answer" };
    }
    return SPOTIFY_OK;
};

// The page only asks questions; a failed check is what it reports, so there is nothing to listen to or to handle.
const NO_LISTENERS: AudioAppWebSocketResponseListener = {};
const IGNORE_ERROR: AudioAppErrorHandler = () => true;

/**
 * Asks the audio server every 30 seconds whether it, the amplifier, search and Spotify answer, and reports it to UXP. The server cannot
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
            const items = [AUDIO_SERVER_OK, (payload as AmplifierReachability | undefined)?.reachable ? AMPLIFIER_OK : AMPLIFIER_ERROR];
            // Search is optional: it has an item only when the server has it switched on.
            const search = (await ws.sendMessageAsync({ action: "search_check", payload: {} })).payload as SearchReachability | undefined;
            if (search?.enabled) items.push(search.reachable ? SEARCH_OK : SEARCH_ERROR);
            // Spotify is optional too.
            const spotify = (await ws.sendMessageAsync({ action: "spotify_check", payload: {} })).payload as SpotifyHealth | undefined;
            if (spotify?.enabled) items.push(spotifyItem(spotify));
            report(items);
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
