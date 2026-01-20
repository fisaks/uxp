import { MessagePayloadSchema } from "@uxp/common";


export type UhnRuntimeMode = "normal" | "debug";
export type UhnLogLevel = "error" | "warn" | "info" | "debug" | "trace";

export type UhnSystemOperationStatus = "queued" | "running" | "completed" | "failed";


/**
 * Client → Server
 */
export type UhnSystemCommand =
    | {
        command: "setRunMode";
        payload: {
            runtimeMode: UhnRuntimeMode; // "normal" | "debug"
        };
    } |
    {
        command: "setLogLevel";
        payload: {
            logLevel: UhnLogLevel; // "error" | "warn" | "info" | "debug" | "trace"
        };
    } |
    {
        command: "stopRuntime" | "restartRuntime" | "startRuntime" | "recompileBlueprint";
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

export type UhnSystemSnapshot = {
    runtime: {
        running: boolean;
        runMode: UhnRuntimeMode;
        logLevel: UhnLogLevel;
    };

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
    oneOf: [
        {
            type: "object",
            properties: {
                command: { type: "string", const: "setRunMode" },
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
                command: { type: "string", enum: ["stopRuntime", "restartRuntime", "startRuntime", "recompileBlueprint"] },
                payload: {
                    type: "object",
                    additionalProperties: false,
                },
            },
            required: ["command", "payload"],
            additionalProperties: false,
        },
    ],
};
