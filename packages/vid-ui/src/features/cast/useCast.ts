import { CastQueueRequest } from "@vid/common";
import { BrowserPlayerCommand } from "../browser-player/browserPlayerLink";
import { useCallback, useMemo } from "react";
import { PLAYER_TAB_ID, postToPlayer } from "../browser-player/browserPlayerLink";
import { browserPlayerSession } from "../browser-player/browserPlayerSession";
import { selectBrowserPlayer, selectBrowserPlayerReceivedAt } from "../browser-player/browserPlayerSelectors";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
    useEditCastQueueMutation,
    useNextCastMutation,
    usePauseCastMutation,
    usePlayCastMutation,
    useRefreshCastMutation,
    useRestartCastMutation,
    useSeekCastMutation,
    useRateCastMutation,
    useStartCastMutation,
    useStopCastMutation,
} from "./cast.api";
import { castErrorCleared, clipsQueued } from "./castSlice";
import { queuedText } from "./castText";
import { selectCastError, selectCastState } from "./castSelectors";

/** The live state of the casts and the commands that change it. A command answers whether it worked; the text of a failure is in `error`. */
export const useCast = () => {
    const dispatch = useAppDispatch();
    const castState = useAppSelector(selectCastState);
    const tab = useAppSelector(selectBrowserPlayer);
    const tabReceivedAt = useAppSelector(selectBrowserPlayerReceivedAt);
    // The player tab is one more player among the Chromecasts.
    const state = useMemo(() => {
        const session = browserPlayerSession(tab, tabReceivedAt);
        return castState && session ? { ...castState, sessions: [...castState.sessions, session] } : castState;
    }, [castState, tab, tabReceivedAt]);
    const error = useAppSelector(selectCastError);
    const [startCast] = useStartCastMutation();
    const [playCast] = usePlayCastMutation();
    const [pauseCast] = usePauseCastMutation();
    const [stopCast] = useStopCastMutation();
    const [restartCast] = useRestartCastMutation();
    const [seekCast] = useSeekCastMutation();
    const [rateCast] = useRateCastMutation();
    const [nextCast] = useNextCastMutation();
    const [editCastQueue] = useEditCastQueueMutation();
    const [refreshCast] = useRefreshCastMutation();

    const clearError = useCallback(() => dispatch(castErrorCleared()), [dispatch]);

    const commands = useMemo(() => {
        const ran = (request: { unwrap: () => Promise<unknown> }) =>
            request.unwrap().then(
                () => true,
                () => false
            );
        /** A command for the player tab goes to it over the channel and has no answer to wait for. */
        const toTab = async (command: BrowserPlayerCommand) => {
            postToPlayer(command);
            return true;
        };
        const forPlayer =
            <Args extends unknown[]>(
                tabCommand: (...args: Args) => BrowserPlayerCommand,
                castCommand: (deviceId: string, ...args: Args) => Promise<boolean>
            ) =>
            (deviceId: string, ...args: Args) =>
                deviceId === PLAYER_TAB_ID ? toTab(tabCommand(...args)) : castCommand(deviceId, ...args);
        return {
            /** Asks the network for Chromecasts again. New ones arrive through the live state. */
            refresh: () => ran(refreshCast()),
            start: (clipId: string, deviceIds: string[], positionSec?: number) => ran(startCast({ clipId, deviceIds, positionSec })),
            play: forPlayer(
                () => ({ action: "play" }),
                (deviceId) => ran(playCast(deviceId))
            ),
            pause: forPlayer(
                () => ({ action: "pause" }),
                (deviceId) => ran(pauseCast(deviceId))
            ),
            stop: forPlayer(
                () => ({ action: "stop" }),
                (deviceId) => ran(stopCast(deviceId))
            ),
            /** Takes the cast down on the Chromecast and casts the clip again from the same place. */
            restart: (deviceId: string) => ran(restartCast(deviceId)),
            /** Plays the next clip of the queue. */
            next: forPlayer(
                () => ({ action: "next-clip" }),
                (deviceId) => ran(nextCast(deviceId))
            ),
            /** Changes the queue of the device. `replace` starts the clips there. */
            editQueue: async (deviceId: string, request: CastQueueRequest) => {
                if (deviceId === PLAYER_TAB_ID) return toTab(request);
                const worked = await ran(editCastQueue({ deviceId, request }));
                const text = queuedText(request.action);
                if (worked && text && "clipIds" in request) {
                    const device = state?.devices.find((d) => d.id === deviceId);
                    dispatch(clipsQueued({ clipIds: request.clipIds, text: `${text} on ${device?.name ?? "the Chromecast"}` }));
                }
                return worked;
            },
            /** Sets the playback speed of a Chromecast. The player tab keeps the speed of its video controls. */
            setRate: (deviceId: string, rate: number) => ran(rateCast({ deviceId, rate })),
            seek: forPlayer(
                (positionSec: number) => ({ action: "seek", positionSec }),
                (deviceId, positionSec: number) => ran(seekCast({ deviceId, positionSec }))
            ),
        };
    }, [
        startCast,
        playCast,
        pauseCast,
        stopCast,
        restartCast,
        seekCast,
        rateCast,
        nextCast,
        editCastQueue,
        refreshCast,
        dispatch,
        state?.devices,
    ]);

    return { state, error, clearError, ...commands };
};
