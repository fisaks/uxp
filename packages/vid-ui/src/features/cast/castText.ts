import { CastSession } from "@vid/common";

const STATE_TEXT: Record<CastSession["state"], string> = {
    PLAYING: "Playing",
    PAUSED: "Paused",
    BUFFERING: "Buffering",
    LOADING: "Starting",
    IDLE: "Idle",
    ENDED: "Finished",
    FAILED: "Failed",
};

export const sessionStateText = (session: CastSession) => (session.state === "FAILED" && session.error ? session.error : STATE_TEXT[session.state]);

/** Where the clip is now: the position of the last push, moved on by the time since then while it plays. */
export const sessionPosition = (session: CastSession, now: number) => {
    const elapsed = session.state === "PLAYING" ? (now - session.updatedAt) / 1000 : 0;
    const position = session.positionSec + elapsed;
    return session.durationSec > 0 ? Math.min(position, session.durationSec) : position;
};
