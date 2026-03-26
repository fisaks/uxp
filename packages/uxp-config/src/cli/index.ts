import { applyConfig } from "./applyConfig";

export async function run(): Promise<void> {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
        switch (command) {
            case "apply": {
                const flags = parseFlags(args.slice(1));
                await applyConfig({
                    key: typeof flags.key === "string" ? flags.key : undefined,
                    url: typeof flags.url === "string" ? flags.url : undefined,
                    profile: typeof flags.profile === "string" ? flags.profile : undefined,
                    configPackage: typeof flags.config === "string" ? flags.config : undefined,
                });
                return;
            }

            case "--help":
            case "-h":
            case undefined: {
                printHelp();
                process.exit(command ? 0 : 1);
            }

            // eslint-disable-next-line no-fallthrough
            default:
                console.error(`Unknown command: ${command}`);
                printHelp();
                process.exit(1);
        }
    } catch (err: any) {
        console.error(`Error: ${err?.message ?? err}`);
        process.exit(1);
    }
}

function parseFlags(args: string[]): Record<string, string | true> {
    const flags: Record<string, string | true> = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith("--")) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
        }
    }
    return flags;
}

function printHelp() {
    console.log(`
uxp-config

Usage:
  uxp-config apply [options]

Commands:
  apply     Apply platform configuration to UXP BFF

Apply options:
  --key <key>           API key (overrides profile)
  --url <url>           UXP BFF URL (overrides profile)
  --profile <name>      Profile from ~/.uxp/config.json (default: defaultProfile)
  --config <pkg>        Config package to import (default: @uxp/config-dev)

Configuration:
  Place a config file at ~/.uxp/config.json:

    {
      "defaultProfile": "dev",
      "profiles": {
        "dev": {
          "url": "http://localhost:3001",
          "key": "<api-key>"
        },
        "prod": {
          "url": "https://prod.example.com:3001",
          "key": "<prod-api-key>"
        }
      }
    }
`);
}
