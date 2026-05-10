import { MessagePayloadSchema, SchemaValidate } from "@uxp/common";
import type { UhnScheduleCreatePayload, UhnScheduleMutePayload, UhnScheduleUnmutePayload, UhnScheduleUpdatePayload } from "../types/uhn-message.type";
import { StoredScheduleAction, UserScheduleSlot } from "../types/uhn-schedule.type";
import { JSONSchemaType } from "ajv";
import { ScheduleWhen } from "@uhn/blueprint";

/** REST schemas for schedule CRUD endpoints. */


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

        },
        {
            properties: {
                kind: { const: 'sun' },
                event: { type: 'string', enum: ['dawn', 'sunrise', 'goldenHourEnd', 'solarNoon', 'goldenHour', 'sunset', 'dusk', 'night'] },
                offsetMinutes: { type: 'number' }
            },
            required: ['kind', 'event'],

        },
        {
            properties: {
                kind: { const: 'date' },
                month: { type: 'number', minimum: 1, maximum: 12 },
                day: { type: 'number', minimum: 1, maximum: 31 },
                time: { type: 'string', pattern: '^\\d{1,2}:\\d{2}$' },
                year: { type: 'number', minimum: 2020, maximum: 2100 }
            },
            required: ['kind', 'month', 'day', 'time'],

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

        },
        {
            properties: {
                type: { const: 'setAnalogOutput' },
                resourceId: { type: 'string', minLength: 1 },
                value: { type: 'number' }
            },
            required: ['type', 'resourceId', 'value'],

        },
        {
            properties: {
                type: { const: 'emitSignal' },
                resourceId: { type: 'string', minLength: 1 },
                value: { type: 'boolean' }
            },
            required: ['type', 'resourceId', 'value'],

        },
        {
            properties: {
                type: { const: 'tap' },
                resourceId: { type: 'string', minLength: 1 }
            },
            required: ['type', 'resourceId'],
        },
        {
            properties: {
                type: { const: 'longPress' },
                resourceId: { type: 'string', minLength: 1 },
                holdMs: { type: 'number', minimum: 0 },
                simulateHold: { type: 'boolean' }
            },
            required: ['type', 'resourceId', 'holdMs'],
        },
        {
            properties: {
                type: { const: 'setActionOutput' },
                resourceId: { type: 'string', minLength: 1 },
                action: { type: 'string', minLength: 1 }
            },
            required: ['type', 'resourceId', 'action'],

        },
        {
            properties: {
                type: { const: 'activateScene' },
                sceneId: { type: 'string', minLength: 1 }
            },
            required: ['type', 'sceneId'],

        }
    ]
} as const;

const slotSchema: JSONSchemaType<UserScheduleSlot> = {
    type: 'object',
    required: ['when', 'actions'],
    properties: {
        name: { type: 'string', minLength: 1 },
        when: scheduleWhenSchema,
        actions: { type: 'array', items: storedScheduleActionSchema, minItems: 1 },
        firedAt: { type: 'string', nullable: true }
    },
    additionalProperties: false,
} as const;

export const CreateScheduleSchema: SchemaValidate<UhnScheduleCreatePayload> = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 1, maxLength: 128 },
            slots: { type: 'array', items: slotSchema, minItems: 1 },
            missedGraceMs: { type: 'number', minimum: 0, nullable: true },
        },
        required: ['name', 'slots'],
        additionalProperties: false,
    }
};

export const UpdateScheduleSchema: SchemaValidate<UhnScheduleUpdatePayload, undefined, { id: number }> = {
    body: {
        type: 'object',
        properties: {

            name: { type: 'string', minLength: 1, maxLength: 128, nullable: true },
            slots: { type: 'array', items: slotSchema, minItems: 1, nullable: true },
            missedGraceMs: { type: 'number', minimum: 0, nullable: true },
        },
        additionalProperties: false,
    },
    params: {
      type: 'object',
        properties: {
            id: { type: 'number', minimum: 1 }
        },
        required: ['id'],
    }

};

export const MuteScheduleSchema: SchemaValidate<UhnScheduleMutePayload> = {
    body: {
        type: 'object',
        properties: {
            scheduleId: { type: 'string', minLength: 1 },
            durationMs: { type: 'number', minimum: 0, nullable: true },
        },
        required: ['scheduleId'],
        additionalProperties: false,
    },
};

export const UnmuteScheduleSchema: SchemaValidate<UhnScheduleUnmutePayload> = {
    body: {
        type: 'object',
        properties: {
            scheduleId: { type: 'string', minLength: 1 },
        },
        required: ['scheduleId'],
        additionalProperties: false,
    },
};
