
import { RuntimeResourceBase } from "./worker.type";
import { ResourceType } from "@uhn/blueprint";
import { RuntimeResourceState } from "./runtime.type";
import { MessagePayloadSchema } from "@uxp/common";

export type UhnSubscriptionPattern =
    | `state/*`
    | `state/${string}`   // e.g., state/device-123, state/resource-abc
    | `resource/*`
    | `resource/${string}`


export type UhnSubscribePayload = {
    patterns: UhnSubscriptionPattern[];
}

export type UhnMessageActionPayloadRequestMap = {
    "uhn:subscribe": UhnSubscribePayload
    "uhn:unsubscribe": UhnSubscribePayload
}

export type UhnResourcesResponse = {
    resources: RuntimeResourceBase<ResourceType>[]
}

export type UhnStateResponse = {
    state: RuntimeResourceState
}
export type UhnFullStateResponse = {
    states: RuntimeResourceState[]
}

export type UhnMessageActionPayloadResponseMap = {
    "uhn:subscribed": UhnSubscribePayload
    "uhn:unsubscribed": UhnSubscribePayload
    "uhn:resources": UhnResourcesResponse
    "uhn:state": UhnStateResponse
    "uhn:fullState": UhnFullStateResponse
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