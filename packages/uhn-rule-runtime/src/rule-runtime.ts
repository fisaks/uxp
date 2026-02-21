import path from "path";
import { createCommandRouter } from "./commands/command-router";
import { runtimeOutput } from "./io/runtime-output";
import { createRuntimeReader } from "./io/runtime-reader";
import { InputGestureEmitter } from "./rule/input-gesture.emitter";
import { ResourceEventEmitter } from "./rule/resource-event.emitter";
import { RuleEngine } from "./rule/rule-engine";
import { TriggerEventBus } from "./rule/trigger-event-bus";
import { RuntimeResourceService } from "./services/runtime-resource.service";
import { RuntimeRulesService } from "./services/runtime-rules.service";
import { RuntimeStateService } from "./services/runtime-state.service";
import { RuleRuntimeDependencies, RuntimeMode, RuntimeModes } from "./types/rule-runtime.type";
import { RuntimeTimerService } from "./services/runtime-timer.service";

const blueprintDir = process.argv[2];
const runMode = process.argv[3] as RuntimeMode
if (!blueprintDir) {
    console.error("Usage: node rule-runtime.js <blueprint-folder>");
    process.exit(1);
}
if (!runMode || RuntimeModes.indexOf(runMode) === -1) {
    console.error(`ERROR: Invalid run mode. Expected one of ${RuntimeModes.join(", ")}`);
    process.exit(1);
}
const resourcesDir = path.join(path.resolve(blueprintDir), "dist", "resources");
const rulesDir = path.join(path.resolve(blueprintDir), "dist", "rules");

async function main() {
    const [resourceService, rulesService] = await Promise.all([
        RuntimeResourceService.create(resourcesDir),
        RuntimeRulesService.create(rulesDir, runMode),
    ]);
    const stateService = new RuntimeStateService();
    const triggerEventBus = new TriggerEventBus();
    const timerService = new RuntimeTimerService(stateService);
    const router = createCommandRouter({
        runMode: runMode,
        resourceService,
        rulesService,
        stateService
    } as RuleRuntimeDependencies);
    // Instances register listeners in constructors; keep references to prevent accidental GC/lint removal.
    const ruleEngine = new RuleEngine(triggerEventBus, rulesService, stateService, timerService);
    const resourceEventEmitter = new ResourceEventEmitter(stateService, triggerEventBus, resourceService);
    const inputGestureEmitter = new InputGestureEmitter(stateService, rulesService, triggerEventBus, resourceService);

    createRuntimeReader((cmd) => {
        router.handle(cmd);
    });

    runtimeOutput.send({ kind: "event", cmd: "ready" });
}

main();