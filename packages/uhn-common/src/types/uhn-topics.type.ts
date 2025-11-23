
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

export type DocumentActionPayloadResponseMap = {
    "topic:message": TopicMessagePayload
    "topic:subscribe": TopicPatternPayload
    "topic:unsubscribe": TopicPatternPayload
}

export const TopicPatternSchema: MessagePayloadSchema<TopicPatternPayload> = {

    type: 'object',
    properties: {
        topicPattern: { type: 'string' },
    },
    required: ['topicPattern']
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
export type Range = {
    start: number;
    count: number;
}

export type DeviceStatePayload = {
    timestamp: string;
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
    action: "setdigitaloutput";
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