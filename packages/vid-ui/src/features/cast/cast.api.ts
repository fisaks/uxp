import { CastState } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";
import { castErrorCleared, castFailed, castStateReceived } from "./castSlice";

const CAST_FAILED_TEXT = "The Chromecast could not do that.";

const sessionUrl = (deviceId: string, action: string) => ({ url: apiUrl(`cast/sessions/${deviceId}/${action}`) });

export const castApi = vidApi.injectEndpoints({
    endpoints: (builder) => {
        /** A cast command answers with the new state of the casts, which goes into the store like the live state does. */
        const castCommand = <Arg>(request: (arg: Arg) => { url: string; data?: object }) =>
            builder.mutation<CastState, Arg>({
                query: (arg) => ({ method: "POST", ...request(arg) }),
                onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                    dispatch(castErrorCleared());
                    try {
                        dispatch(castStateReceived((await queryFulfilled).data));
                    } catch (e) {
                        dispatch(castFailed((e as { error?: { message?: string } }).error?.message || CAST_FAILED_TEXT));
                    }
                },
            });

        return {
            refreshCast: castCommand<void>(() => ({ url: apiUrl("cast/refresh") })),
            startCast: castCommand<{ clipId: string; deviceIds: string[]; positionSec?: number }>((data) => ({
                url: apiUrl("cast/sessions"),
                data,
            })),
            playCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "play")),
            pauseCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "pause")),
            stopCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "stop")),
            restartCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "restart")),
            seekCast: castCommand<{ deviceId: string; positionSec: number }>(({ deviceId, positionSec }) => ({
                ...sessionUrl(deviceId, "seek"),
                data: { positionSec },
            })),
        };
    },
    overrideExisting: false,
});

export const {
    useRefreshCastMutation,
    useStartCastMutation,
    usePlayCastMutation,
    usePauseCastMutation,
    useStopCastMutation,
    useRestartCastMutation,
    useSeekCastMutation,
} = castApi;
