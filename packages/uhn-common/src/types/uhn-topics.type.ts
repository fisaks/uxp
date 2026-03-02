
import { MessagePayloadSchema } from "@uxp/common"

export type TopicPatternPayload = {
    topicPattern: string
}

export type TopicMessagePayload = {
    topic: string,
    message: unknown
}

export type TopicActionPayloadRequestMap = {
    "topic:subscribe": TopicPatternPayload

    "topic:unsubscribe": TopicPatternPayload

}

export type TopicActionPayloadResponseMap = {
    "topic:message": TopicMessagePayload
    "topic:subscribe": TopicPatternPayload
    "topic:unsubscribe": TopicPatternPayload
}

export const TopicPatternSchema: MessagePayloadSchema<TopicPatternPayload> = {

    type: 'object',
    properties: {
        topicPattern: { type: 'string', minLength: 1, maxLength: 256 },
    },
    required: ['topicPattern'],
    additionalProperties: false
}

export type CatalogPayload = {
    devices: DeviceSummary[]
}

export type DeviceSummary = {
    name: string;
    unitId: number;
    type: string;
    busId: string;
    digitalOutputs?: Range;
    digitalInputs?: Range;
    analogOutputs?: Range;
    analogInputs?: Range;
}
export type RegisterType = "uint16" | "int16" | "int32" | "float32" | "uint32";

export type Range = {
    start: number;
    count: number;
    type?: RegisterType;
}

/** Returns the number of 16-bit registers consumed per value for a given register type. */
export function registerWidth(type?: RegisterType): number {
    switch (type) {
        case "float32":
        case "uint32":
        case "int32":
            return 2;
        default:
            return 1;
    }
}

export type DeviceStatePayload = {
    timestamp: string;
    timestampMs: number;
    name: string;
    digitalOutputs?: string;
    digitalInputs?: string;
    analogOutputs?: string;
    analogInputs?: string;
    status: "ok" | "error" | "partial_error";
    errors?: string[];
}

export type DeviceCommandPayload = {
    id?: string;
    device?: string; // overridden by topic
    action: "setdigitaloutput" | "setanalogoutput";
    address: number | string;
    value: 0 | 1 | 2 | number; // 0=off,1=on,2=toggle or analog
    pulseMs?: number;
}

export type EdgeCommandPayload = {
    id?: string;
    action: "resync"
}
const TopicKeys=[
    "uhn/+/device/+/state",
    "uhn/+/device/+/cmd",
    "uhn/+/catalog",
    "uhn/+/cmd",
    "uhn/#"
] as const;
export type UHNTopicPayloadMap = {
    [K in typeof TopicKeys[number]]: K extends "uhn/+/device/+/state" ? DeviceStatePayload
        : K extends "uhn/+/device/+/cmd" ? DeviceCommandPayload
        : K extends "uhn/+/catalog" ? CatalogPayload
        : K extends "uhn/+/cmd" ? EdgeCommandPayload
        : K extends "uhn/#"  ? unknown
        : never;
}

// 2. Extract a union of all topics
type Topic = keyof UHNTopicPayloadMap;