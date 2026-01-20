// system-command.runner.ts
import { SystemCommandExecution } from "./system-command.executor";


export class SystemCommandRunner {
    async runStep<CommandContext>(
        context: CommandContext,
        commandExecution: SystemCommandExecution,
        step: {
            key: string;
            label: string;
            run: (context: CommandContext) => Promise<void> | void;
        }
    ) {
        const { key, label, run } = step;

        let stepState = commandExecution.steps.find(s => s.key === key);
        if (!stepState) {
            stepState = { key, label, state: "started" };
            commandExecution.steps.push(stepState);
        } else {
            stepState.state = "started";
        }

        commandExecution.publish();

        try {
            await run(context);
            stepState.state = "completed";
            commandExecution.publish();
        } catch (err) {
            stepState.state = "failed";
            stepState.message = String(err);
            commandExecution.publish();
            throw err;
        }
    }
}
