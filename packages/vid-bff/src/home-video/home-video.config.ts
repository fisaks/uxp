import os from "os";
import path from "path";

const mediaRoot = process.env.VID_MEDIA_ROOT || undefined;
/** The folder with the home videos, inside the media root. */
const FOLDER_NAME = "HomeVideos";
const dataDir = process.env.VID_DATA_DIR || undefined;

export const homeVideoConfig = {
    /** The folder with the home videos, or undefined when there is no media root. */
    folder: mediaRoot ? path.join(mediaRoot, FOLDER_NAME) : undefined,
    /** Edits to the clips. It lives with the videos, so it is backed up and moves with them. */
    metadataFile: mediaRoot ? path.join(mediaRoot, FOLDER_NAME, "home-video-metadata.json") : undefined,
    /** What can be rebuilt (scan results, poster frames). Without VID_DATA_DIR it is in the temporary folder. */
    cacheDir: dataDir ?? path.join(os.tmpdir(), "vid-cache"),
};

/** Only what a browser and a Chromecast can play. Other formats are converted to MP4 first, and the converted file is what the library lists. */
export const VIDEO_EXTENSIONS = new Set([".m4v", ".mp4"]);
