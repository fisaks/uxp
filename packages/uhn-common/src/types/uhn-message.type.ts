
import type { ScheduleWhen } from "@uhn/blueprint";
import { MessagePayloadSchema } from "@uxp/common";
import { UhnHealthSnapshot } from "./uhn-health.type";
import { RuntimeInteractionView, RuntimeLocation, RuntimeOverviewPayload, RuntimeResource, RuntimeResourceState, RuntimeRuleInfo, RuntimeScene, RuntimeSchedule } from "./uhn-runtime.type";
import type { ScheduleMuteInfo, StoredScheduleAction, UserScheduleInfo, UserScheduleSlot } from "./uhn-schedule.type";


export type UhnSubscriptionPattern =
    | `state/*`
    | `state/${string}`   // e.g., state/device-123, state/resource-abc
    | `resource/*`
    | `resource/${string}`
    | `health/*`
    | 'system/*'
    | 'runtime/*'
    | 'view/*'
    | 'location/*'
    | 'scene/*'
    | 'rule/*'
    | 'schedule/*'
    | 'availability/*';


export type UhnSubscribePayload = {
    patterns: UhnSubscriptionPattern[];
}
export type UhnResourceCommandPayload = {
    resourceId: string;
    command: UhnResourceCommand;

}
export type ClearTimerCommand = {
    type: "clearTimer";
};

export type SetAnalogCommand = {
    type: "setAnalog";
    value: number;
};

export type TapCommand = {
    type: "tap";
};

export type LongPressCommand = {
    type: "longPress";
    holdMs: number;
    simulateHold?: boolean;
};

export type ActionCommand = {
    type: "action";
    action: string;
    metadata?: Record<string, unknown>;
};

export type SetActionOutputCommand = {
    type: "setActionOutput";
    action: string;
};

export type UhnResourceCommand =
    | ToggleCommand
    | SetCommand
    | PressCommand
    | ReleaseCommand
    | ClearTimerCommand
    | SetAnalogCommand
    | TapCommand
    | LongPressCommand
    | ActionCommand
    | SetActionOutputCommand;

export type ToggleCommand = {
    type: "toggle";
};

export type SetCommand = {
    type: "set";
    value: boolean;
};
export type PressCommand = {
    type: "press";
};

export type ReleaseCommand = {
    type: "release";
};

export type UhnSubscribePayloadRequestMap = {
    "uhn:subscribe": UhnSubscribePayload
    "uhn:unsubscribe": UhnSubscribePayload
}
export type UhnSceneActivatePayload = {
    sceneId: string;
}
export type UhnScheduleCreatePayload = {
    name: string;
    slots: UserScheduleSlot[];
    missedGraceMs?: number;
}
export type UhnScheduleUpdatePayload = Partial<UhnScheduleCreatePayload>;

export type UhnScheduleDeletePayload = {
    id: number;
}
export type UhnScheduleMutePayload = {
    scheduleId: string;
    /** Duration in ms, or null for indefinite. */
    durationMs?: number | null;
}
export type UhnScheduleUnmutePayload = {
    scheduleId: string;
}
export type UhnResourcePayloadRequestMap = {
    "uhn:resource:command": UhnResourceCommandPayload
    "uhn:scene:activate": UhnSceneActivatePayload
}

export type UhnResourcesResponse = {
    resources: RuntimeResource[]
}

export type UhnStateResponse = {
    state: RuntimeResourceState
}
export type UhnFullStateResponse = {
    states: RuntimeResourceState[]
}

export type UhnSubscribePayloadResponseMap = {
    "uhn:subscribed": UhnSubscribePayload
    "uhn:unsubscribed": UhnSubscribePayload
}
export type UhnViewsResponse = {
    views: RuntimeInteractionView[];
}

export type UhnLocationsResponse = {
    locations: RuntimeLocation[];
}

export type UhnScenesResponse = {
    scenes: RuntimeScene[];
}

export type UhnRulesResponse = {
    rules: RuntimeRuleInfo[];
}

export type UhnSchedulesResponse = {
    /** Blueprint-defined schedules. */
    schedules: RuntimeSchedule[];
    /** User-created schedules. */
    userSchedules: UserScheduleInfo[];
    /** Mute state for all schedules (blueprint + user). */
    mutes: ScheduleMuteInfo[];
}

export type UhnResourcePayloadResponseMap = {
    "uhn:resources": UhnResourcesResponse
    "uhn:state": UhnStateResponse
    "uhn:fullState": UhnFullStateResponse,
    "uhn:resource:command": UhnResourceCommandPayload
    "uhn:views": UhnViewsResponse
    "uhn:locations": UhnLocationsResponse
    "uhn:scenes": UhnScenesResponse
    "uhn:rules": UhnRulesResponse
    "uhn:schedules": UhnSchedulesResponse
}
export type DeviceAvailabilityEntry = {
    edge: string;
    device: string;
    available: boolean;
    updatedAt: number;
};

export type UhnAvailabilitySnapshotResponse = {
    entries: DeviceAvailabilityEntry[];
};

export type UhnAvailabilityChangeResponse = {
    entry: DeviceAvailabilityEntry;
};

export type UhnAvailabilityPayloadResponseMap = {
    "uhn:availability:snapshot": UhnAvailabilitySnapshotResponse;
    "uhn:availability:change": UhnAvailabilityChangeResponse;
};

export type UhnHealthPayloadResponseMap = {
    "uhn:health:snapshot": UhnHealthSnapshot
}
export type UhnRuntimePayloadResponseMap = {
    "uhn:runtime:overview": RuntimeOverviewPayload
}
export const UhnSubscribePayloadSchema: MessagePayloadSchema<UhnSubscribePayload> = {

    type: 'object',
    properties: {
        patterns: {
            type: 'array', items: {
                type: 'string',
                pattern: '^((state|resource)/.*|health/\\*|system/\\*|runtime/\\*|view/\\*|location/\\*|scene/\\*|rule/\\*|schedule/\\*|availability/\\*)$',
                minLength: 1,
                maxLength: 256
            },
            minItems: 1,
            uniqueItems: true
        },

    },
    required: ['patterns'],
    additionalProperties: false
}

export const UhnSceneActivatePayloadSchema: MessagePayloadSchema<UhnSceneActivatePayload> = {
    type: 'object',
    properties: {
        sceneId: {
            type: 'string',
            minLength: 1,
            maxLength: 256
        },
    },
    required: ['sceneId'],
    additionalProperties: false
}

export const UhnResourceCommandPayloadSchema: MessagePayloadSchema<UhnResourceCommandPayload> = {

    type: 'object',
    properties: {
        resourceId: {
            type: 'string',
            minLength: 1,
            maxLength: 256
        },
        command: {
            type: 'object',
            required: ['type'],
            oneOf: [
                {
                    type: 'object',
                    properties: {
                        type: { const: 'toggle' }
                    },
                    required: ['type'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'set' },
                        value: { type: 'boolean' }
                    },
                    required: ['type', 'value'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'press' }
                    },
                    required: ['type'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'release' }
                    },
                    required: ['type'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'clearTimer' }
                    },
                    required: ['type'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'setAnalog' },
                        value: { type: 'number' }
                    },
                    required: ['type', 'value'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'tap' }
                    },
                    required: ['type'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'longPress' },
                        holdMs: { type: 'number', minimum: 1 },
                        simulateHold: { type: 'boolean' }
                    },
                    required: ['type', 'holdMs'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'action' },
                        action: { type: 'string', minLength: 1 },
                        metadata: { type: 'object' }
                    },
                    required: ['type', 'action'],
                    additionalProperties: false
                },
                {
                    type: 'object',
                    properties: {
                        type: { const: 'setActionOutput' },
                        action: { type: 'string', minLength: 1 }
                    },
                    required: ['type', 'action'],
                    additionalProperties: false
                }
            ]
        }
    },
    required: ['resourceId', 'command'],
    additionalProperties: false
}

