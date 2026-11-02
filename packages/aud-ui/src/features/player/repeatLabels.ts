import { RepeatMode } from "@aud/common";

/** What the repeat button says and does in each mode. */
export const REPEAT_LABELS: Record<RepeatMode, string> = {
    off: "Repeat is off, press to repeat the whole queue",
    all: "Repeating the whole queue, press to repeat this track",
    one: "Repeating this track, press to turn repeat off",
};
