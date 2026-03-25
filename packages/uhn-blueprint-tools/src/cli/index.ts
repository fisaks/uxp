import { z2mImport } from "../z2m/z2m-import";
import { ihcImport } from "../ihc/ihc-import";

const SHORT_FLAGS: Record<string, string> = {
    m: "mqtt-url",
    t: "base-topic",
    e: "edge",
    o: "output-dir",
    f: "force",
    x: "export",
    M: "mapping-only",
    h: "help",
    // IHC-specific
    F: "file",
    H: "host",
    P: "port",
    u: "username",
    p: "password",
    c: "controller",
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
  uhn-blueprint-tools ihc-import [options]

Commands:
  z2m-import    Import Zigbee2MQTT devices as blueprint resources and views.
                Reads bridge/devices from MQTT, generates TypeScript files.

  ihc-import    Import IHC project resources as blueprint resources.
                Reads IHC project XML (local file or SOAP download).

Z2M Options:
  -m, --mqtt-url <url>       MQTT broker URL (default: tcp://localhost:1883)
  -t, --base-topic <topic>   Z2M base topic (default: zigbee2mqtt)
  -e, --edge <name>          Edge name for resources (default: edge1)
  -o, --output-dir <path>    Output directory (default: src)
  -f, --force                Regenerate files for devices in import history with missing files
  -x, --export               Auto-export all generated resource consts
  -M, --mapping-only         Only update factory mapping (no resource/view/factory generation)
  -h, --help                 Show this help

IHC Options:
  -F, --file <path>          Path to IHC project XML file
  -H, --host <ip>            IHC controller host (downloads via SOAP if no --file)
  -P, --port <port>          IHC controller port (default: 443)
  -u, --username <user>      IHC username (for SOAP download)
  -p, --password <pass>      IHC password (for SOAP download)
  -c, --controller <name>    Controller device name (e.g. "ihc2")
  -e, --edge <name>          Edge name (default: edge1)
  -o, --output-dir <path>    Output directory (default: src)
  -f, --force                Regenerate existing files
  -x, --export               Auto-export all generated resource consts
  -M, --mapping-only         Only update factory mapping (no file generation)
`);
}

async function main() {
    const { command, flags } = parseArgs(process.argv);

    if (command === "--help" || command === "-h" || flags.help) {
        printHelp();
        process.exit(0);
    }

    if (command === "z2m-import") {
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
            console.error(`Error: ${err?.message ?? err}`);
            process.exit(1);
        }
        return;
    }

    if (command === "ihc-import") {
        try {
            await ihcImport({
                file: typeof flags.file === "string" ? flags.file : undefined,
                host: typeof flags.host === "string" ? flags.host : undefined,
                port: typeof flags.port === "string" ? parseInt(flags.port, 10) : 443,
                username: typeof flags.username === "string" ? flags.username : undefined,
                password: typeof flags.password === "string" ? flags.password : undefined,
                controller: typeof flags.controller === "string" ? flags.controller : (() => {
                    console.error("Error: --controller (-c) is required for ihc-import");
                    process.exit(1);
                })(),
                edge: typeof flags.edge === "string" ? flags.edge : "edge1",
                outputDir: typeof flags["output-dir"] === "string" ? flags["output-dir"] : "src",
                force: flags.force === true,
                autoExport: flags.export === true,
                mappingOnly: flags["mapping-only"] === true,
            });
        } catch (err: any) {
            console.error(`Error: ${err?.message ?? err}`);
            process.exit(1);
        }
        return;
    }

    if (command) console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}

main();
