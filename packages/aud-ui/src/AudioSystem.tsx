import { UxpTheme } from "@uxp/ui-lib";
import React from "react";
import { AudioSystemBrowserWebSocketManager } from "./app/AudioBrowserWebSocketManager";
import AmplifierPage from "./features/amplifier/AmplifierPage";
import { selectAmplifierOnPlayerInput } from "./features/amplifier/amplifierSelectors";
import { NowPlayingCard } from "./features/player/NowPlayingCard";
import { selectCurrentTrack } from "./features/player/playerSelectors";
import { useAppSelector } from "./hooks";
import { WebSocketConfig } from "./WebSocketConfig";

const getWebSocket = () => AudioSystemBrowserWebSocketManager.getInstance();

/** The now playing card, while the queue has tracks and the amplifier is on the input the player's sound arrives on: on the tuner it is the station that is playing. */
const PlayerSection: React.FC = () => {
    const onPlayerInput = useAppSelector(selectAmplifierOnPlayerInput);
    const track = useAppSelector(selectCurrentTrack);
    if (!onPlayerInput || !track) return null;
    return <NowPlayingCard />;
};

/** The Audio tab of the System Center: the controls used every day, in the narrow drawer. */
const AudioSystem: React.FC = () => (
    <UxpTheme>
        <WebSocketConfig getWebSocket={getWebSocket} reconnectOverlay={false}>
            <AmplifierPage compact nowPlaying={<PlayerSection />} />
        </WebSocketConfig>
    </UxpTheme>
);

export default AudioSystem;
