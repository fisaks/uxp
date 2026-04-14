import { MessagePayloadSchema } from "@uxp/common";
import type { UhnScheduleCreatePayload, UhnScheduleDeletePayload, UhnScheduleMutePayload, UhnScheduleUnmutePayload, UhnScheduleUpdatePayload } from "../types/uhn-message.type";
import { JSONSchemaType } from "ajv";
import { ScheduleWhen } from "@uhn/blueprint";
import { StoredScheduleAction } from "../types/uhn-schedule.type";


const scheduleWhenSchema: JSONSchemaType<ScheduleWhen> = {
    type: 'object',
    required: ['kind'],
    oneOf: [
        {
            properties: {
                kind: { const: 'cron' },
                expression: { type: 'string', minLength: 1 }
            },
            required: ['kind', 'expression'],
            additionalProperties: false
        },
        {
            properties: {
                kind: { const: 'sun' },
                event: { type: 'string', enum: ['dawn', 'sunrise', 'goldenHourEnd', 'solarNoon', 'goldenHour', 'sunset', 'dusk', 'night'] },
                offsetMinutes: { type: 'number' }
            },
            required: ['kind', 'event', 'offsetMinutes'],
            additionalProperties: false
        },
        {
            properties: {
                kind: { const: 'date' },
                month: { type: 'number', minimum: 1, maximum: 12 },
                day: { type: 'number', minimum: 1, maximum: 31 },
                time: { type: 'string', pattern: '^\\d{1,2}:\\d{2}$' }
            },
            required: ['kind', 'month', 'day', 'time'],
            additionalProperties: false
        }

    ]
} as const;

const storedScheduleActionSchema: JSONSchemaType<StoredScheduleAction> = {
    type: 'object',
    required: ['type'],
    oneOf: [
        {
            properties: {
                type: { const: 'setDigitalOutput' },
                resourceId: { type: 'string', minLength: 1 },
                value: { type: 'boolean' }
            },
            required: ['type', 'resourceId', 'value'],
            additionalProperties: false
        },
        {
            properties: {
                type: { const: 'setAnalogOutput' },
                resourceId: { type: 'string', minLength: 1 },
                value: { type: 'number' }
            },
            required: ['type', 'resourceId', 'value'],
            additionalProperties: false
        },
        {
            properties: {
                type: { const: 'emitSignal' },
                resourceId: { type: 'string', minLength: 1 },
                value: { type: 'boolean' }
            },
            required: ['type', 'resourceId', 'value'],
            additionalProperties: false
        },
        {
            properties: {
                type: { const: 'setActionOutput' },
                resourceId: { type: 'string', minLength: 1 },
                action: { type: 'string', minLength: 1 }
            },
            required: ['type', 'resourceId', 'action'],
            additionalProperties: false
        },
        {
            properties: {
                type: { const: 'activateScene' },
                sceneId: { type: 'string', minLength: 1 }
            },
            required: ['type', 'sceneId'],
            additionalProperties: false
        }
    ]
} as const;

export const UhnScheduleCreatePayloadSchema: MessagePayloadSchema<UhnScheduleCreatePayload> = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 128 },
        when: { type: "array", items: scheduleWhenSchema, minItems: 1 },

        actions: { type: 'array', items: storedScheduleActionSchema, minItems: 1 },
        missedGraceMs: { type: 'number', minimum: 0, nullable: true },
    },
    required: ['name', 'when', 'actions'],
    additionalProperties: false
};

export const UhnScheduleUpdatePayloadSchema: MessagePayloadSchema<UhnScheduleUpdatePayload> = {
    type: 'object',
    properties: {
        id: { type: 'number' },
        name: { type: 'string', minLength: 1, maxLength: 128, nullable: true },
        when: { type: 'array', items: scheduleWhenSchema, minItems: 1, nullable: true },
        actions: { type: 'array', items: storedScheduleActionSchema, minItems: 1, nullable: true },
        missedGraceMs: { type: 'number', minimum: 0, nullable: true },
    },
    required: ['id'],
    additionalProperties: false
};

export const UhnScheduleDeletePayloadSchema: MessagePayloadSchema<UhnScheduleDeletePayload> = {
    type: 'object',
    properties: {
        id: { type: 'number' },
    },
    required: ['id'],
    additionalProperties: false
}

export const UhnScheduleMutePayloadSchema: MessagePayloadSchema<UhnScheduleMutePayload> = {
    type: 'object',
    properties: {
        scheduleId: { type: 'string', minLength: 1 },
        durationMs: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null', nullable: true }] }
    },
    required: ['scheduleId', 'durationMs'],
    additionalProperties: false
}
    ;

export const UhnScheduleUnmutePayloadSchema: MessagePayloadSchema<UhnScheduleUnmutePayload> = {
    type: 'object',
    properties: {
        scheduleId: { type: 'string', minLength: 1 },
    },
    required: ['scheduleId'],
    additionalProperties: false
}
