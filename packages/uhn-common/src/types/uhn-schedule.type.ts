import type { ScheduleWhen } from "@uhn/blueprint";

/** MQTT payload published by ScheduleService when a schedule fires. */
export type ScheduleFiredPayload = {
    scheduleId: string;
    firedAt: string; // ISO date
};

/** Action stored in a user-created schedule. Resolved from views at creation time. */
export type StoredScheduleAction =
    | { type: "setDigitalOutput"; resourceId: string; value: boolean }
    | { type: "setAnalogOutput"; resourceId: string; value: number }
    | { type: "emitSignal"; resourceId: string; value: boolean }
    | { type: "setActionOutput"; resourceId: string; action: string }
    | { type: "activateScene"; sceneId: string };

/** User-created schedule as returned by the API. */
export type UserScheduleInfo = {
    id: number;
    blueprintIdentifier: string;
    scheduleId: string;
    name: string;
    when: ScheduleWhen[];
    actions: StoredScheduleAction[];
    missedGraceMs: number;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};

/** Mute state for any schedule (blueprint or user). */
export type ScheduleMuteInfo = {
    scheduleId: string;
    mutedUntil: string | null; // ISO date or null = indefinite
    mutedBy: string;
};

