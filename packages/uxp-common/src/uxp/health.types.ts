import { MessagePayloadSchema } from "../schema/schemaValidate";

export type HealthSeverity = "ok" | "warn" | "error";

export type HealthAction = {
    label: string;
    target: | {
        /**
         * Navigate via a navigation tag.
         * UXP resolves the tag to a concrete route.
         */
        type: "route";
        identifier: string;
        subPath?: string;   // optional app-internal path a sub route in the app
    }
    | {
        /**
         * Open the system panel drawer.
         */
        type: "hash";
        identifier: "system-panel";
        subPath?: string;
    };
};

export type HealthItem<Id extends string = string> = {
    id: Id;
    severity: HealthSeverity;

    /**
     * Short human-readable summary.
     * Shown in the Health Indicator popup.
     */
    message: string;

    /**
     * Optional action hint.
     * Used to navigate the user to the relevant place.
     */
    action?: HealthAction

    /**
     * Optional timestamp (epoch ms).
     * If omitted, treated as "current".
     */
    timestamp?: number;
};

export type HealthSnapshot<AppId extends string = string, Id extends string = string> = {
    appId: AppId;
    items: HealthItem<Id>[];
    updatedAt: string;
};

/** UXP platform health check IDs */
export const UXP_HEALTH_IDS = ["tls-cert"] as const;
export type UxpHealthId = (typeof UXP_HEALTH_IDS)[number];

export type UxpHealthSnapshot = HealthSnapshot<"uxp", UxpHealthId>;

export type UpsertHealthBody = {
    key: UxpHealthId;
    severity: HealthSeverity;
    message: string;
    details?: Record<string, unknown>;
    source?: string;
};

export type HealthKeyParams = {
    key: UxpHealthId;
};

// --- UXP WebSocket payload maps ---

export type UxpSubscriptionPattern =
    | "health/*";

export type UxpSubscribePayload = {
    patterns: UxpSubscriptionPattern[];
};

export type UxpSubscribePayloadRequestMap = {
    "uxp:subscribe": UxpSubscribePayload;
    "uxp:unsubscribe": UxpSubscribePayload;
};

export type UxpSubscribePayloadResponseMap = {
    "uxp:subscribed": UxpSubscribePayload;
    "uxp:unsubscribed": UxpSubscribePayload;
};

export type UxpHealthPayloadResponseMap = {
    "uxp:health:snapshot": UxpHealthSnapshot;
};

// --- UXP WebSocket schemas ---

export const UxpSubscribePayloadSchema: MessagePayloadSchema<UxpSubscribePayload> = {
    type: "object",
    properties: {
        patterns: {
            type: "array",
            items: {
                type: "string",
                pattern: "^health/\\*$",
                minLength: 1,
                maxLength: 256,
            },
            minItems: 1,
            uniqueItems: true,
        },
    },
    required: ["patterns"],
    additionalProperties: false,
};
