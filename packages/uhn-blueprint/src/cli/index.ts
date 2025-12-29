import { buildBlueprint } from "../build";

/**
 * uhn-blueprint CLI entrypoint
 *
 * Commands:
 *   uhn-blueprint build
 */
export async function run(): Promise<void> {
    const [, , command] = process.argv;
    const projectRoot = process.cwd();

    try {
        switch (command) {
            case "build": {
                const zipPath = await buildBlueprint(projectRoot);
                console.log("✅ Blueprint built successfully");
                console.log(`📦 ${zipPath}`);
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
        console.error("❌ Blueprint build failed");
        console.error(err?.message ?? err);
        process.exit(1);
    }
}

function printHelp() {
    console.log(`
uhn-blueprint

Usage:
  uhn-blueprint build

Description:
  Builds a blueprint ZIP for upload to UHN.
  - Type-checks source (no emit)
  - Injects resource IDs into a temporary copy if missing
  - Produces dist/blueprint.zip

Notes:
  - Source files are never modified

`);
}
