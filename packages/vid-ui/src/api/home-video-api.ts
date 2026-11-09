import { HomeVideoStreamLink } from "@vid/common";
import axiosInstance from "./axiosInstance";
import { getBaseUrl } from "../config";

/** An address on the API of the BFF. */
export const apiUrl = (path: string) => `${getBaseUrl().replace(/\/$/, "")}/api/${path}`;

const homeVideosUrl = (path: string) => apiUrl(`home-videos/${path}`);

/** A stream link is made for one playback and runs out, so it is not cached like the data of the pages. */
export const createStreamLink = (id: string) =>
    axiosInstance.post<HomeVideoStreamLink>(homeVideosUrl(`clips/${id}/stream-link`)).then(({ data }) => data);

export const thumbnailUrl = (id: string) => homeVideosUrl(`clips/${id}/thumbnail`);

/** The stream link is a path on the API; the browser plays it from the same address as the rest of the API. */
export const streamUrl = (link: HomeVideoStreamLink) => `${getBaseUrl().replace(/\/$/, "")}${link.path}`;
