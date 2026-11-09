import { ChromecastsState } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";
import { castErrorCleared, castFailed } from "../cast/castSlice";
import { chromecastsReceived } from "./chromecastSlice";

const CHROMECAST_FAILED_TEXT = "The Chromecast could not do that.";

const deviceUrl = (deviceId: string, action: string) => ({ url: apiUrl(`chromecasts/${deviceId}/${action}`) });

export const chromecastApi = vidApi.injectEndpoints({
    endpoints: (builder) => {
        /** A command answers with the new state of the Chromecasts, which goes into the store like the live state does. */
        const command = <Arg>(request: (arg: Arg) => { url: string; data?: object }) =>
            builder.mutation<ChromecastsState, Arg>({
                query: (arg) => ({ method: "POST", ...request(arg) }),
                onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                    dispatch(castErrorCleared());
                    try {
                        dispatch(chromecastsReceived((await queryFulfilled).data));
                    } catch (e) {
                        dispatch(castFailed((e as { error?: { message?: string } }).error?.message || CHROMECAST_FAILED_TEXT));
                    }
                },
            });

        return {
            playChromecast: command<string>((deviceId) => deviceUrl(deviceId, "play")),
            pauseChromecast: command<string>((deviceId) => deviceUrl(deviceId, "pause")),
            stopChromecast: command<string>((deviceId) => deviceUrl(deviceId, "stop")),
            rebootChromecast: command<string>((deviceId) => deviceUrl(deviceId, "reboot")),
            seekChromecast: command<{ deviceId: string; positionSec: number }>(({ deviceId, positionSec }) => ({
                ...deviceUrl(deviceId, "seek"),
                data: { positionSec },
            })),
        };
    },
    overrideExisting: false,
});

export const {
    usePlayChromecastMutation,
    usePauseChromecastMutation,
    useStopChromecastMutation,
    useRebootChromecastMutation,
    useSeekChromecastMutation,
} = chromecastApi;
