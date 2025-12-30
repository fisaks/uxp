import { RuleRuntimeCommand } from "@uhn/common";
import { stdoutWriter } from "./stdout-writer";

export function handleError(cmd: RuleRuntimeCommand, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // request → respond with id
    if ("id" in cmd) {
        stdoutWriter.send({
            kind: "response",
            id: cmd.id,
            error: message,
        });
        return;
    }

    // event → log only
    stdoutWriter.send({
        kind: "event",
        cmd: "log",
        level: "error",
        message: `[rule-runtime] ${cmd.cmd} failed: ${message}`,
    });
}

export function handleUnknownCommand(unknownCommand: never): never {
    throw new Error(`Unknown command: ${JSON.stringify(unknownCommand)}`);
}
