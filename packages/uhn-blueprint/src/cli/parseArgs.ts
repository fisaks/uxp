export function parseArgs(argv: string[]): {
    command: string | undefined;
    flags: Record<string, string | true>;
} {
    const args = argv.slice(2);
    let command: string | undefined;
    const flags: Record<string, string | true> = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg.startsWith("--no-")) {
            flags[arg.slice(5)] = "false";
        } else if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith("--")) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
        } else if (!command) {
            command = arg;
        }
    }

    return { command, flags };
}
