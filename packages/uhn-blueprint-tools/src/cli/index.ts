import { z2mImport } from "../z2m/z2m-import";

const SHORT_FLAGS: Record<string, string> = {
    m: "mqtt-url",
    t: "base-topic",
    e: "edge",
    o: "output-dir",
    f: "force",
    x: "export",
    M: "mapping-only",
    h: "help",
};

function parseArgs(argv: string[]): { command?: string; flags: Record<string, string | true> } {
    const args = argv.slice(2);
    let command: string | undefined;
    const flags: Record<string, string | true> = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            const next = args[i + 1];
            if (next && !next.startsWith("-")) {
                flags[key] = next;
                i++;
            } else {
                flags[key] = true;
            }
        } else if (arg.startsWith("-") && arg.length === 2) {
            const key = SHORT_FLAGS[arg[1]] ?? arg[1];
            const next = args[i + 1];
            if (next && !next.startsWith("-")) {
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

function printHelp() {
    console.log(`
uhn-blueprint-tools

Usage:
  uhn-blueprint-tools z2m-import [options]

Commands:
  z2m-import    Import Zigbee2MQTT devices as blueprint resources and views.
                Reads bridge/devices from MQTT, generates TypeScript files.

Options:
  -m, --mqtt-url <url>       MQTT broker URL (default: tcp://localhost:1883)
  -t, --base-topic <topic>   Z2M base topic (default: zigbee2mqtt)
  -e, --edge <name>          Edge name for resources (default: edge1)
  -o, --output-dir <path>    Output directory (default: src)
  -f, --force                Regenerate files for devices in import history with missing files
  -x, --export               Auto-export all generated resource consts
  -M, --mapping-only         Only update factory mapping (no resource/view/factory generation)
  -h, --help                 Show this help
`);
}

async function main() {
    const { command, flags } = parseArgs(process.argv);

    if (command === "--help" || command === "-h" || flags.help) {
        printHelp();
        process.exit(0);
    }

    if (command !== "z2m-import") {
        if (command) console.error(`❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }

    try {
        await z2mImport({
            mqttUrl: typeof flags["mqtt-url"] === "string" ? flags["mqtt-url"] : "tcp://localhost:1883",
            baseTopic: typeof flags["base-topic"] === "string" ? flags["base-topic"] : "zigbee2mqtt",
            edge: typeof flags.edge === "string" ? flags.edge : "edge1",
            outputDir: typeof flags["output-dir"] === "string" ? flags["output-dir"] : "src",
            force: flags.force === true,
            autoExport: flags.export === true,
            mappingOnly: flags["mapping-only"] === true,
        });
    } catch (err: any) {
        console.error(`❌ ${err?.message ?? err}`);
        process.exit(1);
    }
}

main();
