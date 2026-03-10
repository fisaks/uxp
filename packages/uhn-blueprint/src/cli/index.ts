import fs from "fs-extra";
import path from "path";
import { buildBlueprint } from "../build";
import { parseArgs } from "./parseArgs";
import { readConfig } from "./readConfig";
import { uploadBlueprint } from "./uploadBlueprint";

/**
 * uhn-blueprint CLI entrypoint
 *
 * Commands:
 *   uhn-blueprint build
 *   uhn-blueprint upload [--token <t>] [--url <u>] [--file <f>] [--no-activate]
 */
export async function run(): Promise<void> {
    const { command, flags } = parseArgs(process.argv);
    const projectRoot = typeof flags.project === "string"
        ? path.resolve(flags.project)
        : process.cwd();

    try {
        switch (command) {
            case "build": {
                const zipPath = await buildBlueprint(projectRoot);
                console.log("✅ Blueprint built successfully");
                console.log(`📦 ${zipPath}`);
                return;
            }

            case "upload": {
                const identifier = readBlueprintIdentifier(projectRoot);

                let token = typeof flags.token === "string" ? flags.token : undefined;
                let url = typeof flags.url === "string" ? flags.url : undefined;

                if (!token || !url) {
                    const config = readConfig(identifier);
                    token = token ?? config.token;
                    url = url ?? config.url;
                }

                const zipPath = typeof flags.file === "string"
                    ? path.resolve(flags.file)
                    : path.join(projectRoot, "dist", "blueprint.zip");

                const activate = flags.activate !== "false";

                await uploadBlueprint({ token, url, zipPath, activate });
                return;
            }

            case "--help":
            case "-h":
            case undefined: {
                printHelp();
                process.exit(command ? 0 : 1);
            }

            default:
                console.error(`❌ Unknown command: ${command}`);
                printHelp();
                process.exit(1);
        }
    } catch (err: any) {
        console.error(`❌ ${err?.message ?? err}`);
        process.exit(1);
    }
}

function readBlueprintIdentifier(projectRoot: string): string {
    const blueprintPath = path.join(projectRoot, "blueprint.json");
    if (!fs.existsSync(blueprintPath)) {
        throw new Error("blueprint.json not found in project root.");
    }
    const data = fs.readJsonSync(blueprintPath);
    if (!data.identifier || typeof data.identifier !== "string") {
        throw new Error("blueprint.json is missing a valid \"identifier\" field.");
    }
    return data.identifier;
}

function printHelp() {
    console.log(`
uhn-blueprint

Usage:
  uhn-blueprint build [options]
  uhn-blueprint upload [options]

Commands:
  build     Build a blueprint ZIP for upload to UHN.
  upload    Upload a built blueprint ZIP to UHN.

General options:
  --project <path>  Path to blueprint project root (default: cwd)

Upload options:
  --token <token>   API token (overrides ~/.uhn/ config)
  --url <url>       UHN master URL (overrides ~/.uhn/ config)
  --file <path>     Path to blueprint zip (default: dist/blueprint.zip)
  --no-activate     Upload without activating (default: activate)

Configuration:
  Place a config file at ~/.uhn/<identifier>.json (mode 600)
  in a ~/.uhn/ directory (mode 700):

    {
      "url": "http://192.168.1.100:3005",
      "identifier": "my-blueprint",
      "token": "<api-token>"
    }

  Download this file from the UHN admin UI when creating an API token.
`);
}
