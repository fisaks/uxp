import { RuleRuntimeLogMessage, RuleRuntimeResponse } from "@uhn/common";


export const stdoutWriter = {
    send(response: RuleRuntimeResponse) {
        process.stdout.write(JSON.stringify(response) + "\n");
    },

    log({ level, message, component }: Pick<RuleRuntimeLogMessage, "level" | "message" | "component">) {
        this.send({ kind: "event", cmd: "log", level, message, component });
    }
};
