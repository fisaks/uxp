import { RuleRuntimeCommand } from "@uhn/common";
import { runtimeOutput } from "./runtime-output";
export function handleError(cmd: RuleRuntimeCommand, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    runtimeOutput.log({
        level: "error",
        component: "handleError",
        message: `${cmd.cmd} failed: ${message}`,
    });
}

export function handleUnknownCommand(unknownCommand: never): never {
    throw new Error(`Unknown command: ${JSON.stringify(unknownCommand)}`);
}
