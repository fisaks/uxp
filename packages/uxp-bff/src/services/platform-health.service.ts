import EventEmitter from "events";
import { AppLogger, getRequestContext, runBackgroundTask } from "@uxp/bff-common";
import { GlobalConfigData, HealthChecksConfig, HealthItem, HealthSeverity, TlsCertCheckConfig, UxpHealthId, UxpHealthSnapshot } from "@uxp/common";
import { GlobalConfigEntity } from "../db/entities/GlobalConfigEntity";
import { PlatformHealthEntity } from "../db/entities/PlatformHealthEntity";
import { runTlsCertCheck, HealthCheckResult } from "./health-checks/tls-cert.check";
import { notificationChannelService } from "./notification/notification.service";

const { AppDataSource } = require("../db/typeorm.config");

type RegisteredCheck = {
    key: UxpHealthId;
    intervalMs: number;
    checkFn: () => Promise<void>;
    timer: ReturnType<typeof setInterval> | null;
};

type PlatformHealthEventMap = {
    healthChanged: [snapshot: UxpHealthSnapshot];
};

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    return queryRunner!.manager.getRepository(PlatformHealthEntity);
}

function getGlobalConfigRepo() {
    const { queryRunner } = getRequestContext(true);
    return queryRunner!.manager.getRepository(GlobalConfigEntity);
}

class PlatformHealthServiceImpl extends EventEmitter<PlatformHealthEventMap> {

    private cache = new Map<string, PlatformHealthEntity>();
    private checks = new Map<UxpHealthId, RegisteredCheck>();

    constructor() {
        super();
    }

    async init(): Promise<void> {
        const rows = await getRepo().find();
        for (const row of rows) {
            this.cache.set(row.key, row);
        }
        // reloadConfig needs request context — we're inside runBackgroundTask, so it's available
        await this.reloadConfig();
        AppLogger.info({ message: `PlatformHealthService initialized (${rows.length} cached items)` });

    }

    /** Must be called within a request context */
    async getTlsCertConfig(): Promise<TlsCertCheckConfig | undefined> {
        const configEntity = await getGlobalConfigRepo().findOne({ where: { id: 1 } });
        return configEntity?.config?.healthChecks?.tlsCert;
    }

    /** Must be called within a request context (controller @UseQueryRunner or runBackgroundTask) */
    async reloadConfig(): Promise<void> {
        const configEntity = await getGlobalConfigRepo().findOne({ where: { id: 1 } });
        const config: GlobalConfigData | undefined = configEntity?.config;

        notificationChannelService.reloadConfig(config?.notification ?? {});

        this.manageHealthChecks(config?.healthChecks);
    }

    private manageHealthChecks(healthChecks?: HealthChecksConfig): void {
        const tlsConfig = healthChecks?.tlsCert;
        const tlsKey: UxpHealthId = "tls-cert";

        if (tlsConfig?.enabled) {
            const intervalMs = (tlsConfig.intervalHours || 6) * 60 * 60 * 1000;
            const existing = this.checks.get(tlsKey);

            if (!existing || existing.intervalMs !== intervalMs) {
                if (existing?.timer) clearInterval(existing.timer);

                // Interval callbacks have no request context — wrap in runBackgroundTask
                const checkFn = async () => {
                    await runBackgroundTask(AppDataSource, async () => {
                        const result = await runTlsCertCheck(tlsConfig);
                        await this.upsert(tlsKey, result.severity, result.message, result.details, result.source);
                    });
                };

                const timer = setInterval(checkFn, intervalMs);
                this.checks.set(tlsKey, { key: tlsKey, intervalMs, checkFn, timer });

                checkFn().catch((err) => {
                    AppLogger.error({ message: "TLS cert check failed", object: { error: String(err) } });
                });
            }
        } else {
            const existing = this.checks.get(tlsKey);
            if (existing?.timer) {
                clearInterval(existing.timer);
                this.checks.delete(tlsKey);
            }
        }
    }

    /** Must be called within a request context. Set silent=true to skip email notifications (e.g. manual recheck). */
    async upsert(
        key: UxpHealthId,
        severity: HealthSeverity,
        message: string,
        details?: Record<string, unknown>,
        source?: string,
        silent = false,
    ): Promise<void> {
        const repo = getRepo();
        const existing = await repo.findOne({ where: { key } });

        let entity: PlatformHealthEntity;

        if (existing) {
            existing.severity = severity;
            existing.message = message;
            existing.details = details ?? null;
            if (source) existing.source = source;

            await repo.save(existing);
            entity = existing;

            if (!silent) {
                await this.handleNotification(entity);
            }
        } else {
            entity = new PlatformHealthEntity({
                key,
                severity,
                message,
                details: details ?? null,
                source: source ?? "unknown",
            });
            await repo.save(entity);

            if (!silent && severity !== "ok") {
                await this.sendAlert(entity, "new");
            }
        }

        this.cache.set(key, entity);
        this.broadcast();
    }

    /** Must be called within a request context */
    async remove(key: UxpHealthId): Promise<void> {
        await getRepo().delete({ key });
        this.cache.delete(key);
        this.broadcast();
    }

    getSnapshot(): UxpHealthSnapshot {
        const items: HealthItem<UxpHealthId>[] = Array.from(this.cache.values()).map((e) => ({
            id: e.key,
            severity: e.severity,
            message: e.message,
            timestamp: e.updatedAt?.toMillis(),
        }));

        return {
            appId: "uxp",
            items,
            updatedAt: new Date().toISOString(),
        };
    }

    private async handleNotification(entity: PlatformHealthEntity): Promise<void> {
        const notifiedSev = entity.notifiedSeverity;
        const newSev = entity.severity;

        let alertType: "new" | "escalation" | "recovery" | null = null;

        if (notifiedSev === null || notifiedSev === "ok") {
            if (newSev === "warn" || newSev === "error") alertType = "new";
        } else if (notifiedSev === "warn" && newSev === "error") {
            alertType = "escalation";
        } else if ((notifiedSev === "warn" || notifiedSev === "error") && newSev === "ok") {
            alertType = "recovery";
        }

        if (alertType) {
            await this.sendAlert(entity, alertType);
        }
    }

    private async sendAlert(entity: PlatformHealthEntity, type: "new" | "escalation" | "recovery"): Promise<void> {
        const subjectPrefix =
            type === "recovery" ? "[RECOVERY]" :
                type === "escalation" ? "[ESCALATION]" :
                    entity.severity === "error" ? "[ERROR]" : "[WARNING]";

        const subject = `${subjectPrefix} ${entity.key}: ${entity.message}`;

        await notificationChannelService.notify({
            severity: entity.severity,
            subject,
            message: `Health check: ${entity.key}\nSeverity: ${entity.severity}\nMessage: ${entity.message}\nSource: ${entity.source}`,
            htmlMessage: `
                <h3>Platform Health Alert</h3>
                <table>
                    <tr><td><strong>Check:</strong></td><td>${entity.key}</td></tr>
                    <tr><td><strong>Severity:</strong></td><td>${entity.severity.toUpperCase()}</td></tr>
                    <tr><td><strong>Message:</strong></td><td>${entity.message}</td></tr>
                    <tr><td><strong>Source:</strong></td><td>${entity.source}</td></tr>
                    <tr><td><strong>Type:</strong></td><td>${type}</td></tr>
                </table>
            `.trim(),
            details: entity.details ?? undefined,
        });

        entity.notifiedSeverity = entity.severity;
        await getRepo().save(entity);
        this.cache.set(entity.key, entity);
    }

    private broadcast(): void {
        this.emit("healthChanged", this.getSnapshot());
    }
}

export const PlatformHealthService = new PlatformHealthServiceImpl();
