import { UhnLogLevel, UhnRuntimeMode } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import EventEmitter from "events";
import { SystemConfigEntity } from "../db/entities/SystemConfigEntity";
import { SystemConfigRepository } from "../repositories/system-config.repository";

type SystemConfigEventMap = {
    configChanged: [update: SystemConfigUpdate];
};
type SystemConfigUpdate = {
    runtimeMode: UhnRuntimeMode;
    logLevel: UhnLogLevel;
    debugPort: number;
};

export class SystemConfigService extends EventEmitter<SystemConfigEventMap> {
    private config?: SystemConfigEntity | null;

    constructor() {
        super();
    }
    async ensureExists(): Promise<void> {
        this.config = await SystemConfigRepository.findSystemConfig()

        if (!this.config) {
            this.config = await SystemConfigRepository.save(new SystemConfigEntity({
                runtimeMode: "normal",
                logLevel: "info",
            }));

            AppLogger.info({
                message: "Created default system config",
                object: {
                    runtimeMode: "normal",
                    logLevel: "info",
                },
            });
        }
        AppLogger.setLogLevel(this.config.logLevel);
        this.emit("configChanged", { runtimeMode: this.config.runtimeMode, logLevel: this.config.logLevel, debugPort: this.config.debugPort });
    }

    isInitialized(): boolean {
        return this.config != null;
    }

    getConfig(): SystemConfigEntity {

        if (!this.config) {
            throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "System config not initialized" });
        }

        return this.config;
    }

    async setRuntimeMode(
        runtimeMode: UhnRuntimeMode
    ): Promise<SystemConfigEntity> {
        const config = this.getConfig();

        if (config.runtimeMode === runtimeMode) {
            return config; // no-op
        }

        config.runtimeMode = runtimeMode;
        this.config = await SystemConfigRepository.save(config);

        AppLogger.info({
            message: "Runtime mode updated",
            object: { runtimeMode },
        });
        this.emit("configChanged", { runtimeMode, logLevel: config.logLevel, debugPort: config.debugPort });

        return this.getConfig();
    }

    async setDebugPort(
        debugPort: number
    ): Promise<SystemConfigEntity> {
        const config = this.getConfig();

        if (config.debugPort === debugPort) {
            return config; // no-op
        }

        config.debugPort = debugPort;
        this.config = await SystemConfigRepository.save(config);

        AppLogger.info({
            message: "Debug port updated",
            object: { debugPort },
        });
        this.emit("configChanged", { runtimeMode: config.runtimeMode, logLevel: config.logLevel, debugPort });

        return this.getConfig();
    }

    async setLogLevel(
        logLevel: UhnLogLevel
    ): Promise<SystemConfigEntity> {
        const config = this.getConfig();

        if (config.logLevel === logLevel) {
            return config; // no-op
        }

        config.logLevel = logLevel;
        this.config = await SystemConfigRepository.save(config);

        AppLogger.info({
            message: "Log level updated",
            object: { logLevel },
        });
        AppLogger.setLogLevel(logLevel);
        this.emit("configChanged", { runtimeMode: config.runtimeMode, logLevel, debugPort: config.debugPort });

        return this.getConfig();
    }
}

export const systemConfigService = new SystemConfigService();