import { RuleRuntimeResponse } from "@uhn/common";

export const stdoutWriter = {
    send(response: RuleRuntimeResponse) {
        process.stdout.write(JSON.stringify(response) + "\n");
    }
};
