const SHUTDOWN_MS = 5000;

const tasks: Array<() => Promise<unknown>> = [];

/** `task` is run, and waited for, when the service is stopped (SIGTERM, SIGINT), before the process exits. */
export const onShutdown = (task: () => Promise<unknown>) => {
    if (tasks.push(task) > 1) {
        return;
    }
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
        process.once(signal, () => {
            const exit = () => process.exit(0);
            const done = Promise.allSettled(tasks.map((run) => run()));
            void Promise.race([done, new Promise((resolve) => setTimeout(resolve, SHUTDOWN_MS))]).then(exit, exit);
        });
    }
};
