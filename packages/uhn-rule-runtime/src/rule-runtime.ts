import { RuleRuntimeCommand, RuleRuntimeListResourcesResponse, RuleRuntimeReadyMessage, RuleRuntimeResponse, RuntimeResource, RuntimeResourceList } from "@uhn/common";

import fs from "fs-extra";
import path from "path";

// Usage: node uhn.rule-runtime.js <blueprint-folder>
const blueprintDir = process.argv[2];
if (!blueprintDir) {
    console.error("Usage: node rule-runtime.js <blueprint-folder>");
    process.exit(1);
}
const resourcesDir = path.join(path.resolve(blueprintDir), "dist", "resources");

function humanizeConstName(name: string): string {
    return name
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, c => c.toUpperCase());
}
function isResourceObject(obj: unknown): obj is RuntimeResource {
    return (typeof obj === "object" && obj !== null &&
        "edge" in obj && "type" in obj &&
        typeof obj.edge === "string" && typeof obj.type === "string");
}
async function collectResources(): Promise<RuntimeResourceList> {
    const allResources: RuntimeResourceList = [];
    if (!(await fs.pathExists(resourcesDir))) {
        console.error(`ERROR: resources directory not found: ${resourcesDir}`);
        return [];
    }
    const files = await fs.readdir(resourcesDir);
    for (const file of files) {
        const filePath = path.join(resourcesDir, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile() || !file.endsWith(".js")) continue;

        const mod = require(filePath);
        for (const [exportName, resource] of Object.entries(mod)) {
            if (isResourceObject(resource)) {
                allResources.push({
                    ...resource,
                    id: exportName,
                    name: humanizeConstName(exportName),
                });
            } else {
                console.warn(
                    `[rule-runtime] Skipped non-resource export "${exportName}" in "${file}"`
                );
            }
        }
    }
    return allResources;
}

// Listen for line-delimited JSON commands on stdin
process.stdin.setEncoding("utf8");
const reply = (data: RuleRuntimeResponse) => {
    process.stdout.write(JSON.stringify(data) + "\n");
};

let input = "";
process.stdin.on("data", (chunk) => {
    input += chunk;
    let eol;
    while ((eol = input.indexOf("\n")) >= 0) {
        const line = input.slice(0, eol);
        input = input.slice(eol + 1);
        if (!line.trim()) continue;
        let cmd: RuleRuntimeCommand;
        try {
            cmd = JSON.parse(line);
            if (typeof cmd.id !== "string" || typeof cmd.cmd !== "string")
                throw new Error("Missing id/cmd");
        } catch {
            reply({ id: null, error: "Invalid JSON" });
            continue;
        }
        if (cmd.cmd === "listResources") {
            collectResources().then(resources => {
                reply({ id: cmd.id, resources } satisfies RuleRuntimeListResourcesResponse);
            }).catch(err => {
                reply({ id: cmd.id, error: err.message || String(err) });
            });
        } else {
            reply({ id: cmd.id, error: "Unknown command" });
        }
    }
});
process.stdout.write(JSON.stringify({ cmd: "ready" } satisfies RuleRuntimeReadyMessage) + "\n");
