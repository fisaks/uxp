// system-command.executor.ts
import { UhnSystemCommand, UhnSystemStep } from "@uhn/common";
import { AppErrorV2, runBackgroundTask } from "@uxp/bff-common";
import { systemStatusBroadcaster } from "./system-status.broadcaster";
const { AppDataSource } = require("../db/typeorm.config");

export type SystemCommandExecution = {
    command: UhnSystemCommand["command"];
    steps: UhnSystemStep[];
    publish: () => void;
};


export class SystemCommandExecutor {
    private running = false;

    async executeCommand<CommandContext>(
        command: UhnSystemCommand["command"],
        context: CommandContext,
        message: string | undefined,
        workflow: (
            context: CommandContext,
            commandExecution: SystemCommandExecution
        ) => Promise<void>
    ) {
        if (this.running) {
            throw new AppErrorV2({
                statusCode: 409,
                code: "SYSTEM_BUSY",
                message: "System is already executing a command",
            });
        }

        this.running = true;

        const commandExecution: SystemCommandExecution = {
            command,
            steps: [],
            publish: () => {
                systemStatusBroadcaster.publish({
                    state: "running",
                    command,
                    steps: [...commandExecution.steps],
                    message,
                });
            },
        };

        // Initial publish
        commandExecution.publish();

        try {
            await runBackgroundTask(AppDataSource, async () => {
                await workflow(context, commandExecution);
            });

            systemStatusBroadcaster.publish({
                state: "completed",
                command,
                steps: [...commandExecution.steps],
                message,
            });
        } catch (err) {
            systemStatusBroadcaster.publish({
                state: "failed",
                command,
                steps: [...commandExecution.steps],
                message: String(err),
            });
        } finally {
            this.running = false;
        }
    }

    isRunning() {
        return this.running;
    }
}
