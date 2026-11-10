import { CastGroupMemberRun, CastGroupPhase, CastGroupRun } from "@vid/common";
import { AppLogger } from "@uxp/bff-common";
import { CastSession } from "./cast-session";

const TICK_MS = 1000;
/** A member that has not got ready (loaded, then playing) in this time is given up. */
const READY_TIMEOUT_MS = 40000;
/** Nearer than this to the member furthest behind counts as in sync. */
const DEADBAND_SEC = 0.15;
/** Further ahead than this is seeked back, nearer is slowed down. */
const SEEK_SKEW_SEC = 1;
/** A rate nudge stops when the member is this close. */
const SETTLED_SKEW_SEC = 0.1;
/** The rate of a member that is a little ahead. */
const NUDGE_RATE = 0.95;
/** A seek lands this far short of where it was asked to, so the target is moved on by as much. */
const SEEK_LEAD_SEC = 0.4;
/** After a seek the member buffers: it is left alone for this long. */
const SEEK_COOLDOWN_MS = 5000;
/** A member that buffers for this long makes the others wait for it. */
const BUFFER_WAIT_MS = 1000;
/** In sync: the position of every member is within this of the one furthest behind. */
const IN_SYNC_SEC = 0.3;

export type GroupMember = { deviceId: string; name: string; session: CastSession };

/** How the clip of a group ended for good: every member played it to the end, or failed, or was stopped or replaced. */
export type GroupOutcome = "ended" | "failed" | "gone";

/**
 * The members of a group playing one clip together. The members are loaded paused at the same position, then all told to
 * play. Chromecasts take different times to start, so after that the positions are compared once a second and the ones ahead
 * are brought back: by a seek when far ahead, else by a slightly slower rate until they are level. Nothing is skipped, the
 * member furthest behind sets the pace.
 */
export class CastGroupSession {
    private phase: CastGroupPhase = "LOADING";
    private readonly startedAt = Date.now();
    private timer?: NodeJS.Timeout;
    private readonly cooldownUntil = new Map<string, number>();
    private readonly dropped = new Set<string>();
    /** The members that played the clip to its end and wait for the others. */
    private readonly done = new Set<string>();
    /** The members that run slower than the group to get level. */
    private readonly nudged = new Set<string>();
    /** The members that were paused to wait for one that buffers. */
    private readonly waiting = new Set<string>();
    private readonly bufferingSince = new Map<string, number>();
    /** What the group is meant to do: play, or be paused. A member that goes against it from the outside moves the whole group. */
    private wantPlaying = true;
    /** The state each member had at the last look, to see when one changes. */
    private readonly lastStates = new Map<string, string>();
    /** The speed the user chose, which every member plays at when it is not nudged. */
    private baseRate = 1;

    constructor(
        readonly groupId: string,
        readonly clipId: string,
        private readonly members: GroupMember[],
        private readonly onChange: () => void,
        /** True when the service still has this session for the device: a cast started there since has replaced it. */
        private readonly owns: (member: GroupMember) => boolean,
        /** Called once when no member plays the clip any more, unless the run is released before. */
        private readonly onFinished: (outcome: GroupOutcome) => void
    ) {}

    start() {
        this.timer = setInterval(() => this.tick(), TICK_MS);
    }

    /** Stops following the members; stopping what plays is up to the caller. */
    release() {
        clearInterval(this.timer);
        this.timer = undefined;
        this.setPhase("ENDED");
    }

    get ended(): boolean {
        return this.phase === "ENDED";
    }

    /** True when the session is one of the members of this run. */
    holds(session: CastSession): boolean {
        return this.members.some((member) => member.session === session);
    }

    /** The member that sets the pace, the one furthest behind. When no member plays any more, the first one, for its last state. */
    get referenceSession(): CastSession {
        const alive = this.alive();
        const pool = alive.length > 0 ? alive : this.members;
        return pool.reduce((a, b) => (b.session.currentPositionSec < a.session.currentPositionSec ? b : a)).session;
    }

    get phaseNow(): CastGroupPhase {
        return this.phase;
    }

    play() {
        this.wantPlaying = true;
        this.alive().forEach((member) => member.session.play());
        this.waiting.clear();
    }

    pause() {
        this.wantPlaying = false;
        this.alive().forEach((member) => member.session.pause());
        this.waiting.clear();
    }

    /** Seeks every member; the loop leaves them alone while they buffer and then levels what is left. */
    seek(positionSec: number) {
        for (const member of this.alive()) {
            member.session.seek(positionSec);
            this.cooldownUntil.set(member.deviceId, Date.now() + SEEK_COOLDOWN_MS);
        }
    }

    /** The speed of the whole group, as the user chose it. */
    setRate(rate: number) {
        this.baseRate = rate;
        this.nudged.clear();
        this.alive().forEach((member) => member.session.setRate(rate));
    }

    get snapshot(): CastGroupRun {
        const alive = this.alive();
        const reference = this.reference(alive);
        return {
            groupId: this.groupId,
            clipId: this.clipId,
            phase: this.phase,
            members: this.members.map((member) => this.memberRun(member, reference)),
        };
    }

    private memberRun(member: GroupMember, reference: number): CastGroupMemberRun {
        const { state, playbackRate } = member.session.snapshot;
        const positionSec = member.session.currentPositionSec;
        return {
            deviceId: member.deviceId,
            name: member.name,
            state: this.dropped.has(member.deviceId) ? "DROPPED" : state,
            positionSec,
            skewSec: this.dropped.has(member.deviceId) || this.done.has(member.deviceId) ? 0 : positionSec - reference,
            rate: playbackRate ?? 1,
        };
    }

    /**
     * The members that still take part: not failed, not stopped, not replaced by another cast. One that played the clip to its end
     * stays, it waits for the others.
     */
    private alive(): GroupMember[] {
        for (const member of this.members) {
            if (this.dropped.has(member.deviceId) || this.done.has(member.deviceId)) {
                continue;
            }
            if (member.session.finished && member.session.endedNaturally) {
                this.done.add(member.deviceId);
            } else if (member.session.finished || !this.owns(member)) {
                this.dropped.add(member.deviceId);
                AppLogger.warn(undefined, { message: `[CastGroup] "${member.name}" left the group` });
            }
        }
        return this.members.filter((member) => !this.dropped.has(member.deviceId) && !this.done.has(member.deviceId));
    }

    private reference(alive: GroupMember[]): number {
        return alive.length === 0 ? 0 : Math.min(...alive.map((member) => member.session.currentPositionSec));
    }

    private tick() {
        const alive = this.alive();
        if (alive.length === 0) {
            this.finish();
            return;
        }
        alive.forEach((member) => member.session.requestStatus());
        const states = alive.map((member) => member.session.snapshot.state);
        const waited = Date.now() - this.startedAt;
        switch (this.phase) {
            case "LOADING":
                // All loaded paused at the position: tell them to play at once.
                if (states.every((state) => state === "PAUSED")) {
                    alive.forEach((member) => member.session.play());
                    this.setPhase("STARTING");
                } else if (waited > READY_TIMEOUT_MS) {
                    this.giveUpOnLaggards(alive, (state) => state !== "PAUSED");
                }
                return;
            case "STARTING":
                if (states.every((state) => state === "PLAYING")) {
                    this.setPhase("SYNCING");
                } else if (waited > READY_TIMEOUT_MS) {
                    this.giveUpOnLaggards(alive, (state) => state !== "PLAYING");
                }
                return;
            default:
                this.correct(alive);
        }
    }

    /** No member plays the clip any more: every one that got to the end, else a failure, else it was stopped or replaced. */
    private finish() {
        const outcome: GroupOutcome =
            this.done.size > 0 ? "ended" : this.members.some((member) => member.session.snapshot.state === "FAILED") ? "failed" : "gone";
        this.release();
        this.onFinished(outcome);
    }

    private giveUpOnLaggards(alive: GroupMember[], notReady: (state: string) => boolean) {
        for (const member of alive.filter((m) => notReady(m.session.snapshot.state))) {
            AppLogger.warn(undefined, { message: `[CastGroup] "${member.name}" did not get ready, it leaves the group` });
            this.dropped.add(member.deviceId);
            member.session.stop();
        }
    }

    /** One look at the positions: the members ahead of the one furthest behind are seeked back or slowed down. */
    private correct(alive: GroupMember[]) {
        if (this.followOutsideChange(alive)) {
            return;
        }
        if (this.waitForBuffering(alive)) {
            return;
        }
        // A member that buffers has no position worth comparing, the next look takes it into account again.
        if (alive.some((member) => member.session.snapshot.state !== "PLAYING")) {
            return;
        }
        const reference = this.reference(alive);
        let largest = 0;
        for (const member of alive) {
            const skew = member.session.currentPositionSec - reference;
            largest = Math.max(largest, skew);
            this.correctMember(member, skew, reference);
        }
        this.setPhase(largest <= IN_SYNC_SEC ? "PLAYING" : "SYNCING");
    }

    /**
     * A member paused or played from outside (the remote of a TV, a phone) moves the others the same way, so the group stays one
     * player. Only a change of state counts: what our own commands do is the state the group wants already. True when it acted.
     */
    private followOutsideChange(alive: GroupMember[]): boolean {
        const wanted = this.wantPlaying ? "PLAYING" : "PAUSED";
        const unwanted = this.wantPlaying ? "PAUSED" : "PLAYING";
        const changed = alive.find(
            ({ deviceId, session }) =>
                session.snapshot.state === unwanted && this.lastStates.get(deviceId) === wanted && !this.waiting.has(deviceId)
        );
        alive.forEach(({ deviceId, session }) => this.lastStates.set(deviceId, session.snapshot.state));
        if (!changed) {
            return false;
        }
        AppLogger.info(undefined, {
            message: `[CastGroup] "${changed.name}" was ${unwanted === "PAUSED" ? "paused" : "played"}: the group follows`,
        });
        const others = alive.filter((member) => member !== changed);
        this.wantPlaying = !this.wantPlaying;
        this.waiting.clear();
        others.forEach((member) => (this.wantPlaying ? member.session.play() : member.session.pause()));
        return true;
    }

    /**
     * A member that buffers for a while holds the others back: they are paused, and play on when it does. A member that buffers
     * after a seek of ours is not waited for, it is behind and the others pass it. True while the others wait.
     */
    private waitForBuffering(alive: GroupMember[]): boolean {
        const now = Date.now();
        const buffering = alive.filter(({ deviceId, session }) => {
            if (session.snapshot.state !== "BUFFERING" || (this.cooldownUntil.get(deviceId) ?? 0) > now) {
                this.bufferingSince.delete(deviceId);
                return false;
            }
            if (!this.bufferingSince.has(deviceId)) {
                this.bufferingSince.set(deviceId, now);
            }
            return now - (this.bufferingSince.get(deviceId) ?? now) > BUFFER_WAIT_MS;
        });
        if (buffering.length > 0) {
            for (const member of alive) {
                if (!buffering.includes(member) && member.session.snapshot.state === "PLAYING" && !this.waiting.has(member.deviceId)) {
                    AppLogger.info(undefined, { message: `[CastGroup] "${member.name}" waits for "${buffering[0].name}", which buffers` });
                    this.waiting.add(member.deviceId);
                    member.session.pause();
                }
            }
            return true;
        }
        if (this.waiting.size === 0) {
            return false;
        }
        // Nobody buffers any more: those that waited play on, and the loop levels them from the next look.
        for (const member of alive.filter(({ deviceId }) => this.waiting.has(deviceId))) {
            member.session.play();
        }
        this.waiting.clear();
        return true;
    }

    private correctMember(member: GroupMember, skew: number, reference: number) {
        const { session, name, deviceId } = member;
        if ((this.cooldownUntil.get(deviceId) ?? 0) > Date.now()) {
            return;
        }
        const nudged = this.nudged.has(deviceId);
        // A receiver may keep the speed of the clip before, or not take a command: it is set again until it reports the right one.
        const expectedRate = nudged ? this.baseRate * NUDGE_RATE : this.baseRate;
        if (Math.abs((session.snapshot.playbackRate ?? 1) - expectedRate) > 0.001) {
            session.setRate(expectedRate);
            return;
        }
        if (skew > SEEK_SKEW_SEC) {
            AppLogger.info(undefined, { message: `[CastGroup] "${name}" is ${skew.toFixed(2)} s ahead: seek` });
            session.seek(reference + SEEK_LEAD_SEC);
            this.cooldownUntil.set(deviceId, Date.now() + SEEK_COOLDOWN_MS);
        } else if (skew > DEADBAND_SEC && !nudged) {
            AppLogger.info(undefined, { message: `[CastGroup] "${name}" is ${skew.toFixed(2)} s ahead: slower` });
            this.nudged.add(deviceId);
            session.setRate(this.baseRate * NUDGE_RATE);
        } else if (skew < SETTLED_SKEW_SEC && nudged) {
            AppLogger.info(undefined, { message: `[CastGroup] "${name}" is level (${skew.toFixed(2)} s): normal rate` });
            this.nudged.delete(deviceId);
            session.setRate(this.baseRate);
        }
    }

    private setPhase(phase: CastGroupPhase) {
        if (this.phase !== phase) {
            this.phase = phase;
            AppLogger.info(undefined, { message: `[CastGroup] ${this.groupId}: ${phase}` });
            this.onChange();
        }
    }
}
