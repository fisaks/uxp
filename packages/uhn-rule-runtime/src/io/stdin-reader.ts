import { RuleRuntimeCommand, RuleRuntimeLogMessage } from "@uhn/common";
import { stdoutWriter } from "./stdout-writer";

function isCommandObject(obj: unknown): obj is RuleRuntimeCommand {
    return (typeof obj === "object" && obj !== null &&
        "kind" in obj && "cmd" in obj &&
        typeof obj.kind === "string" &&
        typeof obj.cmd === "string");
}

export function createStdinReader(
    onCommand: (cmd: RuleRuntimeCommand) => void
) {
    process.stdin.setEncoding("utf8");

    let input = "";

    process.stdin.on("data", chunk => {
        input += chunk;
        let eol;
        while ((eol = input.indexOf("\n")) >= 0) {
            const line = input.slice(0, eol);
            input = input.slice(eol + 1);

            if (!line.trim()) continue;

            try {
                const cmd = JSON.parse(line);

                if (!isCommandObject(cmd)) {
                    throw new Error("Not a valid command object");
                }

                onCommand(cmd);
            } catch {
                stdoutWriter.send({
                    kind: "event",
                    cmd: "log",
                    level: "error",
                    message: "[StdinReader] Received invalid JSON command",
                } satisfies RuleRuntimeLogMessage);

            }
        }
    });
}
