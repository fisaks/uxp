
import { MessagePayloadSchema } from "@uxp/common";
import { RuntimeResource, RuntimeResourceState } from "./uhn-runtime.type";
import { HealthItem } from "./uhn-health.type";


export type UhnSubscriptionPattern =
    | `state/*`
    | `state/${string}`   // e.g., state/device-123, state/resource-abc
    | `resource/*`
    | `resource/${string}`
    | `health/*`


export type UhnSubscribePayload = {
    patterns: UhnSubscriptionPattern[];
}
export type UhnResourceCommandPayload = {
    resourceId: string;
    command: UhnResourceCommand;

}
export type UhnResourceCommand =
    | ToggleCommand
    | SetCommand
    | PressCommand
    | ReleaseCommand;

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
export type UhnResourcePayloadRequestMap = {
    "uhn:resource:command": UhnResourceCommandPayload
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
export type UhnResourcePayloadResponseMap = {
    "uhn:resources": UhnResourcesResponse
    "uhn:state": UhnStateResponse
    "uhn:fullState": UhnFullStateResponse,
    "uhn:resource:command": UhnResourceCommandPayload
}
export type UhnHealthPayloadResponseMap = {
    "uhn:health:snapshot": HealthItem
}
export const UhnSubscribePayloadSchema: MessagePayloadSchema<UhnSubscribePayload> = {

    type: 'object',
    properties: {
        patterns: {
            type: 'array', items: {
                type: 'string',
                pattern: '^(state|resource)/.*$',
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
                }
            ]
        }
    },
    required: ['resourceId', 'command'],
    additionalProperties: false
}
