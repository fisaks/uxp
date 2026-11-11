import { CastGroupRun, CastGroupStartRequest, CastQueueRequest, CastState } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { rejectionText } from "../../api/errorText";
import { vidApi } from "../../app/vidApi";
import { castErrorCleared, castFailed, castStateReceived } from "./castSlice";

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
                        dispatch(castFailed(rejectionText(e)));
                    }
                },
            });

        return {
            refreshCast: castCommand<void>(() => ({ url: apiUrl("cast/refresh") })),
            startCast: castCommand<{ clipId: string; deviceIds: string[]; positionSec?: number }>((data) => ({
                url: apiUrl("cast/sessions"),
                data,
            })),
            /** The state of the casts arrives through the live state; the answer is only the start of the run. */
            startCastGroup: builder.mutation<CastGroupRun, { groupId: string } & CastGroupStartRequest>({
                query: ({ groupId, ...data }) => ({ method: "POST", url: apiUrl(`cast/groups/${groupId}/start`), data }),
                onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                    dispatch(castErrorCleared());
                    try {
                        await queryFulfilled;
                    } catch (e) {
                        dispatch(castFailed(rejectionText(e)));
                    }
                },
            }),
            playCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "play")),
            pauseCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "pause")),
            stopCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "stop")),
            restartCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "restart")),
            nextCast: castCommand<string>((deviceId) => sessionUrl(deviceId, "next")),
            editCastQueue: castCommand<{ deviceId: string; request: CastQueueRequest }>(({ deviceId, request }) => ({
                url: apiUrl(`cast/players/${deviceId}/queue`),
                data: request,
            })),
            rateCast: castCommand<{ deviceId: string; rate: number }>(({ deviceId, rate }) => ({
                ...sessionUrl(deviceId, "rate"),
                data: { rate },
            })),
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
    useStartCastGroupMutation,
    usePlayCastMutation,
    usePauseCastMutation,
    useStopCastMutation,
    useRestartCastMutation,
    useSeekCastMutation,
    useRateCastMutation,
    useNextCastMutation,
    useEditCastQueueMutation,
} = castApi;
