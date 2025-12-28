import { AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

const { AppDataSource } = require("../db/typeorm.config");

type BlueprintRuntimeSupervisorEventMap = {
    ruleRuntimeReady: [];
    ruleRuntimeRestarting: [];
    ruleRuntimeStopped: [];
};
class BlueprintRuntimeSupervisorService extends EventEmitter<BlueprintRuntimeSupervisorEventMap> {
    private shouldRestart = true;
    private running = false;
    private restartAttempts = 0;
    private readonly restartBaseDelayMs = 500;
    private readonly restartMaxDelayMs = 30000;

    private getRestartDelayMs() {
        // Exponential backoff with cap delay doubles with each consecutive restart attempt starting from 1s to max 30s
        const delay = this.restartBaseDelayMs * Math.pow(2, this.restartAttempts);
        return Math.min(delay, this.restartMaxDelayMs);
    }
    private attachRestartHandler() {
        ruleRuntimeProcessService.once("exit", async () => {
            if (this.shouldRestart) {
                const delay = this.getRestartDelayMs();
                this.restartAttempts++;
                this.emit("ruleRuntimeRestarting");
                AppLogger.warn({
                    message: `[BlueprintRuntimeSupervisorService] Rule runtime exited unexpectedly, restarting in ${delay} ms (attempt ${this.restartAttempts})`,
                });

                await new Promise(res => setTimeout(res, delay));
                this.attachRestartHandler();
                try {
                    await ruleRuntimeProcessService.startRuleRuntime(BlueprintFileUtil.ActiveBlueprintFolder);
                    this.restartAttempts = 0;
                    this.emit("ruleRuntimeReady");
                } catch (error) {
                    AppLogger.error({
                        message: `[BlueprintRuntimeSupervisorService] Failed to restart rule runtime:`,
                        error,
                    });
                }

            }
        });
    }

    async start() {
        if (this.running) return;
        this.running = true;
        this.shouldRestart = true;
        this.restartAttempts = 0;
        await ruleRuntimeProcessService.startRuleRuntime(BlueprintFileUtil.ActiveBlueprintFolder);
        this.attachRestartHandler();
        this.emit("ruleRuntimeReady");
    }

    async stop() {
        if (!this.running) return;
        this.shouldRestart = false;
        this.restartAttempts = 0;
        await ruleRuntimeProcessService.stopRuleRuntime();
        this.running = false;
        this.emit("ruleRuntimeStopped");
    }
}

export async function startBlueprintRuntimeSupervisorServices() {

    try {
        await runBackgroundTask(AppDataSource, async () => {
            const active = await BlueprintRepository.findActive();
            if (active && active.active && active.status === "installed" && await BlueprintFileUtil.activeBlueprintExists()) {
                AppLogger.info({
                    message: `Starting blueprint runtime service for active blueprint ${active.identifier} v${active.version}`,
                });
                await blueprintRuntimeSupervisorService.start();
            }
        })
    } catch (error) {
        AppLogger.error({
            message: `Failed to start blueprint runtime service:`,
            error,
        });
    }
}

export const blueprintRuntimeSupervisorService = new BlueprintRuntimeSupervisorService();