import path from "path";
import { createCommandRouter } from "./commands/command-router";
import { createStdinReader } from "./io/stdin-reader";
import { stdoutWriter } from "./io/stdout-writer";
import { RuntimeResourceService } from "./services/runtime-resource.service";
import { RuntimeStateService } from "./services/runtime-state.service";
import { RuleRuntimeDependencies, RuntimeMode, RuntimeModes } from "./types/rule-runtime.type";

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

async function main() {
    const router = createCommandRouter({
        runMode: runMode,
        resourceService: await RuntimeResourceService.create(resourcesDir),
        stateService: new RuntimeStateService(),
    } as RuleRuntimeDependencies);


    createStdinReader((cmd) => {
        router.handle(cmd);
    });

    stdoutWriter.send({ kind: "event", cmd: "ready" });
}

main();