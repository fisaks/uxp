import { RuleRuntimeCommand } from "@uhn/common";
import { runtimeOutput } from "./runtime-output";
export function handleError(cmd: RuleRuntimeCommand, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // request → respond with id
    if ("id" in cmd) {
        runtimeOutput.error({
            id: cmd.id,
            error: message,
        });
        return;
    }

    // event → log only
    runtimeOutput.log({
        level: "error",
        component: "handleError",
        message: `${cmd.cmd} failed: ${message}`,
    });
}

export function handleUnknownCommand(unknownCommand: never): never {
    throw new Error(`Unknown command: ${JSON.stringify(unknownCommand)}`);
}
