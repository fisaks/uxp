import { RuleRuntimeStateUpdateCommand } from "@uhn/common";
import { stdoutWriter } from "../io/stdout-writer";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export async function handleStateUpdate({ stateService }: RuleRuntimeDependencies, cmd: RuleRuntimeStateUpdateCommand) {
    const { resourceId, timestamp, value } = cmd.payload;
    stateService.update(resourceId, value, timestamp);
    stdoutWriter.send({
        cmd: "log",
        kind: "event",
        level: "info",
        message: `[StateUpdateHandler] Updated state for resource ${resourceId} to value ${JSON.stringify(value)} at timestamp ${timestamp}`
    });

}
