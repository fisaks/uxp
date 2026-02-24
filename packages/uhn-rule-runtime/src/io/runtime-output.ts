import { RuleRuntimeLogMessage, RuleRuntimeResponse } from "@uhn/common";


export const runtimeOutput = {
    send(response: RuleRuntimeResponse) {
        process.stdout.write(JSON.stringify(response) + "\n");
    },

    log({ level, message, component, data }: Pick<RuleRuntimeLogMessage, "level" | "message" | "component" | "data">) {
        this.send({ kind: "event", cmd: "log", level, message, component, data });
    }
};
