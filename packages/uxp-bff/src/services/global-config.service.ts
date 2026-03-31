import { GlobalConfigData, GlobalConfigPublic } from "@uxp/common";
import { getRequestContext } from "@uxp/bff-common";
import { GlobalConfigEntity } from "../db/entities/GlobalConfigEntity";
import { ConfigCryptoService } from "./config-crypto.service";
import { PlatformHealthService } from "./platform-health.service";

const SMTP_PASSWORD_MASK = "********";
const DEFAULT_CONFIG: GlobalConfigData = { siteName: "Unified Experience Platform" };

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    return queryRunner!.manager.getRepository(GlobalConfigEntity);
}

async function findConfig(): Promise<GlobalConfigEntity | null> {
    return getRepo().findOne({ where: { id: 1 } });
}

async function getPublicConfig(): Promise<{ updatedAt: string; config: GlobalConfigPublic } | null> {
    const entity = await findConfig();
    if (!entity) return null;

    return {
        updatedAt: entity.updatedAt.toISO()!,
        config: { siteName: entity.config.siteName },
    };
}

async function getFullConfig(): Promise<{ updatedAt: string; config: GlobalConfigData } | null> {
    const entity = await findConfig();
    if (!entity) return null;

    const masked = deepClone(entity.config);
    if (masked.notification?.email?.smtp?.password) {
        masked.notification.email.smtp.password = SMTP_PASSWORD_MASK;
    }

    return {
        updatedAt: entity.updatedAt.toISO()!,
        config: masked,
    };
}

async function patchConfig(
    key: string,
    value: unknown,
    updatedBy: string,
): Promise<void> {
    const repo = getRepo();
    const existing = await findConfig();
    const currentConfig: GlobalConfigData = existing?.config ? deepClone(existing.config) : { ...DEFAULT_CONFIG };

    // Handle SMTP password
    if (key === "notification.email.smtp.password") {
        if (!value) {
            // Empty → keep existing
            value = existing?.config.notification?.email?.smtp?.password ?? "";
        } else {
            value = await ConfigCryptoService.encrypt(value as string);
        }
    }

    setNestedValue(currentConfig, key, value);

    // Auto-set SMTP port when secure is toggled
    if (key === "notification.email.smtp.secure") {
        setNestedValue(currentConfig, "notification.email.smtp.port", value ? 465 : 587);
    }

    if (existing) {
        await repo.update(1, { config: currentConfig, updatedBy });
    } else {
        await repo.save(new GlobalConfigEntity({ config: currentConfig, updatedBy }));
    }

    // Reload platform services when relevant config changes
    if (key.startsWith("notification") || key.startsWith("healthChecks")) {
        await PlatformHealthService.reloadConfig();
    }
}

// --- Helpers ---

function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function setNestedValue(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
    const keys = keyPath.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

export const GlobalConfigService = {
    getPublicConfig,
    getFullConfig,
    patchConfig,
};
