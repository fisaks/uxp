import { AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

const { AppDataSource } = require("../db/typeorm.config");

type BlueprintRuntimeSupervisorEventMap = {
    ruleRuntimeStarting: [];
    ruleRuntimeReady: [];
    ruleRuntimeRestarting: [restartAttempts: number];
    ruleRuntimeStopped: [];
};
class BlueprintRuntimeSupervisorService extends EventEmitter<BlueprintRuntimeSupervisorEventMap> {
    private runId = 0;
    private running = false;
    private restartAttempts = 0;
    private readonly restartBaseDelayMs = 500;
    private readonly restartMaxDelayMs = 30000;

    private getRestartDelayMs() {
        // Exponential backoff with cap delay doubles with each consecutive restart attempt starting from 1s to max 30s
        const delay = this.restartBaseDelayMs * Math.pow(2, this.restartAttempts);
        return Math.min(delay, this.restartMaxDelayMs);
    }
    private attachRestartHandler(forRunId: number) {
        ruleRuntimeProcessService.once("exit", async () => {
            if (this.runId === forRunId) {
                const delay = this.getRestartDelayMs();
                this.restartAttempts++;
                this.emit("ruleRuntimeRestarting", this.restartAttempts);
                AppLogger.warn({
                    message: `[BlueprintRuntimeSupervisorService] Rule runtime exited unexpectedly, restarting in ${delay} ms (attempt ${this.restartAttempts})`,
                });

                await new Promise(res => setTimeout(res, delay));
                if (this.runId !== forRunId) return; // check if stopped during wait
                this.attachRestartHandler(forRunId);
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
        this.runId++;
        this.restartAttempts = 0;
        this.emit("ruleRuntimeStarting");
        await ruleRuntimeProcessService.startRuleRuntime(BlueprintFileUtil.ActiveBlueprintFolder);
        this.attachRestartHandler(this.runId);
        this.emit("ruleRuntimeReady");
    }

    async stop() {
        if (!this.running) return;
        this.runId++;
        this.restartAttempts = 0;
        await ruleRuntimeProcessService.stopRuleRuntime();
        this.running = false;
        this.emit("ruleRuntimeStopped");
    }

    isRunning() {
        return this.running;
    }
}

export const blueprintRuntimeSupervisorService = new BlueprintRuntimeSupervisorService();