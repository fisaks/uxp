import path from "path";
import { homeVideoConfig } from "../home-video/home-video.config";

export const uploadConfig = {
    /** Where unfinished uploads are kept: beside the library so the finished file moves with a rename. The scanner ignores it. */
    folder: homeVideoConfig.folder ? path.join(homeVideoConfig.folder, "_incoming") : undefined,
};

/** Uploads are taken only while there is room for two files of the largest size: the upload and its conversion. */
export const UPLOAD_FREE_SPACE_FACTOR = 2;
/** How many uploads one user may have open, so a broken client cannot fill the disk with sessions. */
export const MAX_SESSIONS_PER_USER = 3;
/** An upload nobody has written to for this long is removed: 48 hours (172 800 s, 172 800 000 ms). */
export const STALE_UPLOAD_MS = 48 * 60 * 60 * 1000;
/** How often stale uploads are looked for: 1 hour (3 600 s, 3 600 000 ms). */
export const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
