export type HealthSeverity = "ok" | "warn" | "error";

export type HealthItem = {
    id: string;
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
    action?: {
        label: string;
        target: {
            type: "route" | "systemPanel";
            value: string;
        };
    };

    /**
     * Optional timestamp (epoch ms).
     * If omitted, treated as "current".
     */
    timestamp?: number;
};
