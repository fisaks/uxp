import path from "path";
import { homeVideoConfig } from "../home-video/home-video.config";

/** How a Chromecast reaches this server: its address on the network, with the port. Without it casting is off. */
const baseUrl = process.env.VID_PUBLIC_BASE_URL?.replace(/\/+$/, "") || undefined;

export const castConfig = {
    baseUrl,
    /** The queues of the Chromecasts, so they survive a restart. */
    queuesFile: path.join(homeVideoConfig.cacheDir, "cast-queues.json"),
};
export type CastConfig = typeof castConfig;
