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
