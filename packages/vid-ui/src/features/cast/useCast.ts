import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
    usePauseCastMutation,
    usePlayCastMutation,
    useRefreshCastMutation,
    useRestartCastMutation,
    useSeekCastMutation,
    useStartCastMutation,
    useStopCastMutation,
} from "./cast.api";
import { castErrorCleared } from "./castSlice";
import { selectCastError, selectCastState } from "./castSelectors";

/** The live state of the casts and the commands that change it. A command answers whether it worked; the text of a failure is in `error`. */
export const useCast = () => {
    const dispatch = useAppDispatch();
    const state = useAppSelector(selectCastState);
    const error = useAppSelector(selectCastError);
    const [startCast] = useStartCastMutation();
    const [playCast] = usePlayCastMutation();
    const [pauseCast] = usePauseCastMutation();
    const [stopCast] = useStopCastMutation();
    const [restartCast] = useRestartCastMutation();
    const [seekCast] = useSeekCastMutation();
    const [refreshCast] = useRefreshCastMutation();

    const clearError = useCallback(() => dispatch(castErrorCleared()), [dispatch]);

    const commands = useMemo(() => {
        const ran = (request: { unwrap: () => Promise<unknown> }) =>
            request.unwrap().then(
                () => true,
                () => false
            );
        return {
            /** Asks the network for Chromecasts again. New ones arrive through the live state. */
            refresh: () => ran(refreshCast()),
            start: (clipId: string, deviceIds: string[], positionSec?: number) => ran(startCast({ clipId, deviceIds, positionSec })),
            play: (deviceId: string) => ran(playCast(deviceId)),
            pause: (deviceId: string) => ran(pauseCast(deviceId)),
            stop: (deviceId: string) => ran(stopCast(deviceId)),
            /** Takes the cast down on the Chromecast and casts the clip again from the same place. */
            restart: (deviceId: string) => ran(restartCast(deviceId)),
            seek: (deviceId: string, positionSec: number) => ran(seekCast({ deviceId, positionSec })),
        };
    }, [startCast, playCast, pauseCast, stopCast, restartCast, seekCast, refreshCast]);

    return { state, error, clearError, ...commands };
};
