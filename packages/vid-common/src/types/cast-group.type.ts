/**
 * Chromecasts that play the same clips in sync. A running group is one player: its id is used wherever a device id is, so the
 * id looks like one (a UUID without dashes). With `browser` the player tab plays along as a follower: it is not a device of the
 * group and never sets the pace.
 */
export type CastGroup = {
    id: string;
    name: string;
    deviceIds: string[];
    browser: boolean;
};

/** A group is saved with a name, the devices in it and whether the player tab joins; at least two members counting the tab. */
export type CastGroupRequest = {
    name: string;
    deviceIds: string[];
    browser?: boolean;
};

export type CastGroupParams = {
    id: string;
};

/** Plays a clip on all the devices of a group. */
export type CastGroupStartRequest = {
    clipId: string;
    positionSec?: number;
};

/** Where a running group is: loading the members, starting them together, or keeping them in sync. */
export type CastGroupPhase = "LOADING" | "STARTING" | "SYNCING" | "PLAYING" | "ENDED";

export type CastGroupMemberRun = {
    deviceId: string;
    name: string;
    state: string;
    positionSec: number;
    /** How far ahead of the member that is furthest behind, in seconds. */
    skewSec: number;
    rate: number;
};

export type CastGroupRun = {
    groupId: string;
    clipId: string;
    phase: CastGroupPhase;
    members: CastGroupMemberRun[];
};
