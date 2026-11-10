import { CastQueueRequest, CastSessionSnapshot } from "@vid/common";

const STATE_TEXT: Record<CastSessionSnapshot["state"], string> = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    BUFFERING: "Buffering",
    LOADING: "Starting",
    IDLE: "Idle",
    ENDED: "Finished",
    FAILED: "Failed",
};

export const sessionStateText = (session: CastSessionSnapshot) =>
    session.state === "FAILED" && session.error ? session.error : STATE_TEXT[session.state];

/** Where the clip is now: the position of the last push, moved on by the time since then while it plays. */
export const sessionPosition = (session: CastSessionSnapshot, now: number) => {
    const elapsed = session.state === "PLAYING" ? ((now - session.updatedAt) / 1000) * (session.playbackRate ?? 1) : 0;
    const position = session.positionSec + elapsed;
    return session.durationSec > 0 ? Math.min(position, session.durationSec) : position;
};

/** What the banner says when clips are put in a queue. */
const QUEUED_TEXT: Partial<Record<CastQueueRequest["action"], string>> = {
    next: "Plays next",
    append: "Added to the queue",
    replace: "Playing",
};

export const queuedText = (action: CastQueueRequest["action"]) => QUEUED_TEXT[action];

/** Where the members of a group are: "2 in sync" while they all do the same, else the ones that differ. */
export const membersText = (session: CastSessionSnapshot) => {
    const { members = [] } = session;
    const apart = members.filter((m) => m.state !== session.state);
    return apart.length === 0
        ? `${members.length} in sync`
        : apart.map((m) => `${m.name} ${(STATE_TEXT[m.state as CastSessionSnapshot["state"]] ?? m.state).toLowerCase()}`).join(", ");
};

/** What a group is made of, for a card or a menu: the number of Chromecasts, and the player tab when it plays along. */
export const groupMembersText = (group: { deviceIds: string[]; browser: boolean }) =>
    `${group.deviceIds.length} Chromecasts${group.browser ? " + player tab" : ""} in sync`;
