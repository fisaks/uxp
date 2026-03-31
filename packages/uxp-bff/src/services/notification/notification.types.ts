import { HealthSeverity } from "@uxp/common";

export type NotificationAlert = {
    severity: HealthSeverity;
    subject: string;
    message: string;
    htmlMessage?: string;
    details?: Record<string, unknown>;
};

export interface NotificationChannel<TConfig = unknown> {
    readonly type: string;
    reloadConfig(config: TConfig | undefined): void;
    send(alert: NotificationAlert): Promise<void>;
    isConfigured(): boolean;
}
