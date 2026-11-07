import { HomeVideoClip, HomeVideoClipUpdate, HomeVideoLabels, HomeVideoSearchResult, HomeVideoStreamLink, VidStatus } from "@vid/common";
import axiosInstance from "./axiosInstance";
import { getBaseUrl } from "../config";

const apiUrl = (path: string) => `${getBaseUrl().replace(/\/$/, "")}/api/home-videos/${path}`;

export const fetchClips = () => axiosInstance.get<HomeVideoClip[]>(apiUrl("clips")).then(({ data }) => data);

export const fetchLabels = () => axiosInstance.get<HomeVideoLabels>(apiUrl("labels")).then(({ data }) => data);

export const fetchSearchAvailable = () =>
    axiosInstance.get<VidStatus>(`${getBaseUrl().replace(/\/$/, "")}/api/status`).then(({ data }) => data.searchAvailable);

/** The ids of the clips that match the words, best match first. */
export const searchClips = (q: string) =>
    axiosInstance.get<HomeVideoSearchResult>(apiUrl("search"), { params: { q } }).then(({ data }) => data.ids);

export const patchClip = (id: string, update: HomeVideoClipUpdate) =>
    axiosInstance.patch<HomeVideoClip>(apiUrl(`clips/${id}`), update).then(({ data }) => data);

export const createStreamLink = (id: string) => axiosInstance.post<HomeVideoStreamLink>(apiUrl(`clips/${id}/stream-link`)).then(({ data }) => data);

export const thumbnailUrl = (id: string) => apiUrl(`clips/${id}/thumbnail`);

/** The stream link is a path on the API; the browser plays it from the same address as the rest of the API. */
export const streamUrl = (link: HomeVideoStreamLink) => `${getBaseUrl().replace(/\/$/, "")}${link.path}`;
