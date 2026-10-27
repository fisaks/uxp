// JSON schemas that validate the payloads of the amplifier WebSocket actions

import { SLEEP_TIMER_MINUTES } from "../types/amplifier.type";

const BOOLEAN_ON_SCHEMA = {
    type: "object",
    properties: { on: { type: "boolean" } },
    required: ["on"],
    additionalProperties: false,
};

export const AmplifierSetPowerSchema = BOOLEAN_ON_SCHEMA;
export const AmplifierSetStraightSchema = BOOLEAN_ON_SCHEMA;
export const AmplifierSetEnhancerSchema = BOOLEAN_ON_SCHEMA;
export const AmplifierSetPureDirectSchema = BOOLEAN_ON_SCHEMA;
export const AmplifierSetAdaptiveDrcSchema = BOOLEAN_ON_SCHEMA;
export const AmplifierSetCinemaDsp3dSchema = BOOLEAN_ON_SCHEMA;

export const AmplifierSetMuteSchema = {
    type: "object",
    properties: { muted: { type: "boolean" } },
    required: ["muted"],
    additionalProperties: false,
};

export const AmplifierSetVolumeSchema = {
    type: "object",
    properties: { volumeDb: { type: "number" } },
    required: ["volumeDb"],
    additionalProperties: false,
};

export const AmplifierSetInputSchema = {
    type: "object",
    properties: { input: { type: "string", maxLength: 50 } },
    required: ["input"],
    additionalProperties: false,
};

export const AmplifierSetSoundProgramSchema = {
    type: "object",
    properties: { program: { type: "string", maxLength: 50 } },
    required: ["program"],
    additionalProperties: false,
};

export const AmplifierSetTunerFrequencySchema = {
    type: "object",
    properties: { frequency: { type: "integer" } },
    required: ["frequency"],
    additionalProperties: false,
};

export const AmplifierSetToneSchema = {
    type: "object",
    properties: { db: { type: "number" } },
    required: ["db"],
    additionalProperties: false,
};

export const AmplifierSetDialogueSchema = {
    type: "object",
    properties: { level: { type: "number" } },
    required: ["level"],
    additionalProperties: false,
};

export const AmplifierSetSleepSchema = {
    type: "object",
    properties: { minutes: { type: "integer", enum: SLEEP_TIMER_MINUTES } },
    required: ["minutes"],
    additionalProperties: false,
};
