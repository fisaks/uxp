import { HealthSeverity } from "@uxp/common";

export type HealthLevel = HealthSeverity | "unknown";

export type HealthNotice = {
    appId: string;
    severity: HealthSeverity;
    message: string;
    timestamp: number;
};