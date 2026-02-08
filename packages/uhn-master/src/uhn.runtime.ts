//uhn.runtime.ts
import { AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { initBlueprintResourceDispatcher } from "./dispatchers/blueprint-resource.dispatcher";
import { initRuleActionDispatcher } from "./dispatchers/rule-action.dispatcher";
import { initStateRuntimeDispatcher } from "./dispatchers/state-runtime.dispatcher";
import { initTopicTraceDispatcher } from "./dispatchers/topic-trace.dispatcher";
import { initUhnHealthDispatcher } from "./dispatchers/uhn-health.dispatcher";
import { blueprintService } from "./services/blueprint.service";
const { AppDataSource } = require("./db/typeorm.config");

/* ============================================================================
 *  RUNTIME BOOTSTRAP (singleton side effects)
 *  Importing these registers listeners, background loops, and subscriptions.
 * ========================================================================== */
import { initUhnSystemDispatcher } from "./dispatchers/uhn-system.dispatcher";
import "./services/blueprint-resource.service";
import "./services/blueprint-runtime-supervisor.service";
import "./services/blueprint.service";
import "./services/command-edge.service";
import "./services/mqtt.service";
import "./services/physical-catalog.service";
import "./services/rule-runtime-process.service";
import "./services/state-physical.service";
import "./services/state-runtime.service";
import "./services/state-signal.service";
import "./services/subscription.service";
import "./services/master-key.service";
import "./services/edge-identity.service";
import { systemConfigService } from "./services/system-config.service";
import "./services/uhn-health.service";

export async function startUhnRuntime() {
    await runStartupBackgroundTasks();
    setupWebDispatchers();

}

async function runStartupBackgroundTasks() {

    try {
        await runBackgroundTask(AppDataSource, async () => {
            await systemConfigService.ensureExists();
            await blueprintService.initializeRuntimeFromState();
        })
    } catch (error) {
        AppLogger.error({
            message: `Failed to start blueprint runtime service:`,
            error,
        });
    }
}

const setupWebDispatchers = () => {

    // Initialize dispatchers
    initTopicTraceDispatcher();
    initBlueprintResourceDispatcher();
    initStateRuntimeDispatcher();
    initRuleActionDispatcher();
    initUhnHealthDispatcher();
    initUhnSystemDispatcher();
};

