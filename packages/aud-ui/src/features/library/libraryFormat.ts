import { getBaseUrl } from "../../config";

/** 213 seconds is "3:33", and 3725 seconds is "1:02:05". */
export const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
};

export const coverUrl = (albumId: string) => `${getBaseUrl().replace(/\/$/, "")}/api/cover/${albumId}`;
