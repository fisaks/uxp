import { RuleRuntimeListResourcesCommand } from "@uhn/common";
import { stdoutWriter } from "../io/stdout-writer";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export async function handleListResources(deps: Pick<RuleRuntimeDependencies, "resourceService" | "runMode">, cmd: RuleRuntimeListResourcesCommand) {
    stdoutWriter.send({
        kind: "response",
        id: cmd.id,
        resources: deps.resourceService.list(),
    });
}
