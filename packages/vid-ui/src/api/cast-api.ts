import { CastState } from "@vid/common";
import axiosInstance from "./axiosInstance";
import { getBaseUrl } from "../config";

const apiUrl = (path: string) => `${getBaseUrl().replace(/\/$/, "")}/api/cast/${path}`;

/** Every call answers with the new state of the casts. */
export const startCast = (clipId: string, deviceIds: string[], positionSec?: number) =>
    axiosInstance.post<CastState>(apiUrl("sessions"), { clipId, deviceIds, positionSec }).then(({ data }) => data);

export const castRefresh = () => axiosInstance.post<CastState>(apiUrl("refresh")).then(({ data }) => data);

export const castPlay = (deviceId: string) => axiosInstance.post<CastState>(apiUrl(`sessions/${deviceId}/play`)).then(({ data }) => data);

export const castPause = (deviceId: string) => axiosInstance.post<CastState>(apiUrl(`sessions/${deviceId}/pause`)).then(({ data }) => data);

export const castStop = (deviceId: string) => axiosInstance.post<CastState>(apiUrl(`sessions/${deviceId}/stop`)).then(({ data }) => data);

export const castRestart = (deviceId: string) =>
    axiosInstance.post<CastState>(apiUrl(`sessions/${deviceId}/restart`)).then(({ data }) => data);

export const castSeek = (deviceId: string, positionSec: number) =>
    axiosInstance.post<CastState>(apiUrl(`sessions/${deviceId}/seek`), { positionSec }).then(({ data }) => data);
