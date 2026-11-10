import { CastSessionSnapshot } from "@vid/common";

/** A tab further off than this from the group jumps to the right place. */
const SEEK_SEC = 1;
/** A tab off by more than this changes its speed a little to catch up, and goes back to the normal speed when it is within SETTLED_SEC. */
const NUDGE_SEC = 0.15;
const SETTLED_SEC = 0.1;
const NUDGE_FACTOR = 0.05;
/** A seek lands this far ahead, since the tab keeps playing while it seeks (the Chromecasts are aimed the same way). */
const LEAD_SEC = 0.4;

/** What the tab does to follow the row of the group: nothing, a jump to a position, or a new speed. */
export type FollowAction = { seekTo: number } | { rate: number } | undefined;

/**
 * Where the group is now, in seconds. `offsetMs` is how far the clock of this browser is ahead of the clock of the server that
 * stamped the row (`updatedAt`).
 */
export const groupPosition = (row: CastSessionSnapshot, offsetMs: number, now: number): number =>
    row.state === "PLAYING" ? row.positionSec + ((now - offsetMs - row.updatedAt) / 1000) * (row.playbackRate ?? 1) : row.positionSec;

/** Decides how the video catches up with the group: a jump when far off, else a small change of speed. */
export const followAction = (
    row: CastSessionSnapshot,
    offsetMs: number,
    now: number,
    currentTime: number,
    currentRate: number
): FollowAction => {
    const base = row.playbackRate ?? 1;
    const skew = currentTime - groupPosition(row, offsetMs, now);
    if (row.state !== "PLAYING")
        return Math.abs(skew) > NUDGE_SEC ? { seekTo: row.positionSec } : currentRate !== base ? { rate: base } : undefined;
    if (Math.abs(skew) > SEEK_SEC) return { seekTo: groupPosition(row, offsetMs, now) + LEAD_SEC * base };
    if (skew > NUDGE_SEC) return { rate: base * (1 - NUDGE_FACTOR) };
    if (skew < -NUDGE_SEC) return { rate: base * (1 + NUDGE_FACTOR) };
    if (Math.abs(skew) < SETTLED_SEC && currentRate !== base) return { rate: base };
    return undefined;
};
