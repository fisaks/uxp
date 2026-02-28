import { MessagePayloadSchema } from "@uxp/common";
import { RuntimeStatus } from "./uhn-runtime.type";

export type UhnRuntimeMode = "normal" | "debug";
export type UhnLogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type UhnSystemOperationStatus = "queued" | "running" | "completed" | "failed";

export type UhnSystemCommandTarget = "all" | "master" | (string & {});

/**
 * Client → Server
 */
export type UhnSystemCommand =
    | {
        command: "setRunMode";
        target?: UhnSystemCommandTarget;
        payload: {
            runtimeMode: UhnRuntimeMode; // "normal" | "debug"
        };
    } |
    {
        command: "setLogLevel";
        target?: UhnSystemCommandTarget;
        payload: {
            logLevel: UhnLogLevel; // "error" | "warn" | "info" | "debug" | "trace"
        };
    } |
    {
        command: "stopRuntime" | "restartRuntime" | "startRuntime";
        target?: UhnSystemCommandTarget;
        payload: {};
    }|
    {
        command: "setDebugPort";
        target: UhnSystemCommandTarget;
        payload: {
            debugPort: number;
        };
    }|
    {
        command: "recompileBlueprint";
        payload: {};
    }




/**
 * Server → Clients
 */

export type UhnSystemStep = {
    key: string;
    label: string;
    state: "started" | "completed" | "failed";
    message?: string;
};
export type UhnSystemStatus =
    | { state: "idle" }
    | {
        state: "running" | "completed" | "failed";
        command: UhnSystemCommand["command"];
        steps: UhnSystemStep[];
        message?: string;
    }

export type UhnRuntimeConfig = {
    logLevel: UhnLogLevel;
    runMode: UhnRuntimeMode;
    debugPort?: number;
    runtimeStatus: RuntimeStatus;
    nodeOnline: boolean;
};

export type UhnSystemSnapshot = {
    runtimes: Record<string, UhnRuntimeConfig>;

    blueprint: {
        active: boolean;
        hasErrors: boolean;
    };

    updatedAt: number;
};


export type UhnSystemPayloadRequestMap = {
    "uhn:system:command": UhnSystemCommand
}
export type UhnSystemPayloadResponseMap = {
    "uhn:system:status": UhnSystemStatus;
    "uhn:system:snapshot": UhnSystemSnapshot;
}

/**
 * AJV schema
 */
export const UhnSystemCommandSchema: MessagePayloadSchema<UhnSystemCommand> = {
    type: "object",
    required: [],

    oneOf: [
        {
            type: "object",
            properties: {
                command: { type: "string", const: "setRunMode" },
                target: { type: "string" },
                payload: {
                    type: "object",
                    properties: {
                        runtimeMode: {
                            type: "string",
                            enum: ["normal", "debug"],
                        },
                    },
                    required: ["runtimeMode"],
                    additionalProperties: false,
                },
            },
            required: ["command", "payload"],
            additionalProperties: false,
        },
        {
            type: "object",
            properties: {
                command: { type: "string", const: "setLogLevel" },
                target: { type: "string" },
                payload: {
                    type: "object",
                    properties: {
                        logLevel: {
                            type: "string",
                            enum: ["error", "warn", "info", "debug", "trace"],
                        },
                    },
                    required: ["logLevel"],
                    additionalProperties: false,
                },
            },
            required: ["command", "payload"],
            additionalProperties: false,
        },
        {
            type: "object",
            properties: {
                command: { type: "string", enum: ["stopRuntime", "restartRuntime", "startRuntime"] },
                target: { type: "string" },
                payload: {
                    type: "object",
                    additionalProperties: false,
                },
            },
            required: ["command", "payload"],
            additionalProperties: false,
        },
        {
            type: "object",
            properties: {
                command: { type: "string", const: "setDebugPort" },
                target: { type: "string" },
                payload: {
                    type: "object",
                    properties: {
                        debugPort: {
                            type: "integer",
                            minimum: 1024,
                            maximum: 65535,
                        },
                    },
                    required: ["debugPort"],
                    additionalProperties: false,
                },
            },
            required: ["command", "payload","target"],
            additionalProperties: false,
        },
        {
            type: "object",
            properties: {
                command: { type: "string", const:  "recompileBlueprint" },
                payload: {
                    type: "object",
                    additionalProperties: false,
                },
            },
            required: ["command", "payload"],
            additionalProperties: false,
        }
    ],
};
