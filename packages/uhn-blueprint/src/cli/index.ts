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
 *   uhn-blueprint upload [--env <e>] [--token <t>] [--url <u>] [--file <f>] [--no-activate]
 */
export async function run(): Promise<void> {
    const { command, flags } = parseArgs(process.argv);
    const projectRoot = typeof flags.project === "string"
        ? path.resolve(flags.project)
        : process.cwd();

    try {
        switch (command) {
            case "build": {
                await doBuild(projectRoot, flags);
                return;
            }

            case "bupload": {
                const builtZip = await doBuild(projectRoot, flags);
                await doUpload(projectRoot, flags, builtZip);
                return;
            }

            case "upload": {
                const zipPath = typeof flags.file === "string"
                    ? path.resolve(flags.file)
                    : path.join(projectRoot, "dist", "blueprint.zip");
                await doUpload(projectRoot, flags, zipPath);
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

async function doBuild(projectRoot: string, flags: Record<string, string | true>): Promise<string> {
    const devFilter = typeof flags["dev-filter"] === "string" ? flags["dev-filter"] : undefined;
    const zipPath = await buildBlueprint(projectRoot, { devFilter });
    console.log("✅ Blueprint built successfully");
    console.log(`📦 ${zipPath}`);
    if (devFilter) {
        console.log(`🔬 Dev filter: ${devFilter}`);
    }
    return zipPath;
}

async function doUpload(projectRoot: string, flags: Record<string, string | true>, zipPath: string): Promise<void> {
    const identifier = readBlueprintIdentifier(projectRoot);
    const env = typeof flags.env === "string" ? flags.env : undefined;

    let token = typeof flags.token === "string" ? flags.token : undefined;
    let url = typeof flags.url === "string" ? flags.url : undefined;

    if (!token || !url) {
        const config = readConfig(identifier, env);
        token = token ?? config.token;
        url = url ?? config.url;
    }

    const activate = flags.activate !== "false";

    await uploadBlueprint({ token, url, zipPath, activate });
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
  uhn-blueprint bupload [options]

Commands:
  build     Build a blueprint ZIP for upload to UHN.
  upload    Upload a built blueprint ZIP to UHN.
  bupload   Build + upload in one step.

General options:
  --project <path>     Path to blueprint project root (default: cwd)
  --dev-filter <name>  Apply a dev filter preset from src/dev-filters/ (build/bupload)

Upload options:
  --env <name>      Environment name (reads ~/.uhn/<identifier>.<env>.json)
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

  For multiple environments, use --env to select a config file:
    ~/.uhn/my-blueprint.json       (default, no --env)
    ~/.uhn/my-blueprint.dev.json   (--env dev)
    ~/.uhn/my-blueprint.prod.json  (--env prod)
`);
}
