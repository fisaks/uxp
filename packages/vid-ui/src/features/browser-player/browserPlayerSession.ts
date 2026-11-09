import { CastSessionSnapshot } from "@vid/common";
import { BrowserPlayerState, PLAYER_TAB_ID } from "./browserPlayerLink";

/** The player tab as a session, so that it is shown and controlled like a Chromecast that plays. None when it has nothing queued. */
export const browserPlayerSession = (player: BrowserPlayerState | undefined, receivedAt: number): CastSessionSnapshot | undefined => {
    const clipId = player?.clipIds[player.index];
    if (!player || !clipId) return undefined;
    return {
        deviceId: PLAYER_TAB_ID,
        deviceName: "Player tab",
        clipId,
        title: "",
        state: player.state,
        positionSec: player.positionSec,
        durationSec: player.durationSec,
        updatedAt: receivedAt,
        queue: { clipIds: player.clipIds, index: player.index, repeat: player.repeat },
    };
};
