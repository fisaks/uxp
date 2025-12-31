import { RuleRuntimeListResourcesCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export async function handleListResources(deps: Pick<RuleRuntimeDependencies, "resourceService" | "runMode">, cmd: RuleRuntimeListResourcesCommand) {
    runtimeOutput.send({
        kind: "response",
        id: cmd.id,
        resources: deps.resourceService.list(),
    });
}
