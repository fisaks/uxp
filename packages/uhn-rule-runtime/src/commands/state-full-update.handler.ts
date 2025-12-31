import { ResourceState } from "@uhn/blueprint";
import { RuleRuntimeStateFullUpdateCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export async function handleStateFullUpdate({ stateService }: RuleRuntimeDependencies, cmd: RuleRuntimeStateFullUpdateCommand) {

    const payload = cmd.payload;
    const newState: Map<string, ResourceState> = new Map<string, ResourceState>()
    for (const resState of payload) {
        newState.set(resState.resourceId, {
            value: resState.value,
            timestamp: resState.timestamp
        })
    }

    stateService.replaceAll(newState);
    runtimeOutput.log({
        level: "info",
        component: "handleStateFullUpdate",
        message: `Replaced all state with new state containing ${newState.size} resources`
    });
}


