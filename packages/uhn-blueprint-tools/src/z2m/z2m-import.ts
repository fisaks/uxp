import fs from "fs";
import path from "path";
import { readBridgeDevices } from "./mqtt-reader";
import { parseExposes } from "./expose-parser";
import { generateResourceFile } from "./resource-gen";
import { generateViewFile } from "./view-gen";
import { generateEdgeConfig } from "./edge-config-gen";
import { generateFactoryFile } from "./factory-gen";
import { loadFactoryMapping, ensureMappingDefaults, saveFactoryMapping } from "./factory-mapping";
import { getMappingKey } from "./resource-gen";
import { deviceToFileName } from "./naming";
import type { ParsedDevice, Z2MDevice } from "./types";

export type Z2MImportOptions = {
    mqttUrl: string;
    baseTopic: string;
    edge: string;
    outputDir: string;
    force?: boolean;
    autoExport?: boolean;
    mappingOnly?: boolean;
};

type HistoryEntry = {
    importedAt: string;
    resourceFile: string;
    viewFile: string;
};

type ImportHistory = Record<string, HistoryEntry>;

const Z2M_DIR = ".z2m";
const DATA_DIR = ".z2m/data";
const HISTORY_FILE = "import-history.json";

export async function z2mImport(opts: Z2MImportOptions): Promise<void> {
    console.log(`Connecting to ${opts.mqttUrl} (topic: ${opts.baseTopic}/bridge/devices)...`);

    const z2mDevices = await readBridgeDevices(opts.mqttUrl, opts.baseTopic);
    console.log(`Found ${z2mDevices.length} device(s)\n`);

    // Save raw Z2M data per device
    fs.mkdirSync(DATA_DIR, { recursive: true });
    savePerDeviceJSON(z2mDevices, DATA_DIR);

    // Load import history
    const history = loadHistory();

    const parsed: ParsedDevice[] = [];

    for (const z2m of z2mDevices) {
        const exposes = z2m.definition?.exposes ?? [];
        const properties = parseExposes(exposes);
        if (properties.length === 0) {
            console.log(`  ⚠ ${z2m.friendly_name}: no mappable properties, skipping`);
            continue;
        }

        parsed.push({
            friendlyName: z2m.friendly_name,
            description: z2m.definition?.description,
            properties,
        });

        const writable = properties.filter(p => p.writable).length;
        console.log(`  ✓ ${z2m.friendly_name}: ${properties.length} properties (${writable} writable)`);
    }

    if (parsed.length === 0) {
        console.log("\nNo devices with mappable properties found.");
        return;
    }

    // Load/update factory mapping — preserves author edits, adds new kinds
    const mapping = loadFactoryMapping();
    const usedKeys = new Set<string>();
    for (const device of parsed) {
        for (const prop of device.properties) {
            usedKeys.add(getMappingKey(prop, device));
        }
    }
    ensureMappingDefaults(mapping, usedKeys, opts.edge);
    saveFactoryMapping(mapping);

    if (opts.mappingOnly) {
        console.log(`\n✅ Factory mapping updated (--mapping-only). Review .z2m/factory-mapping.json, then run without --mapping-only to generate files.`);
        return;
    }

    // Generate zigbee factory (always regenerated, skips kinds mapped to project factory)
    const factoryDir = path.join(opts.outputDir, "factory");
    fs.mkdirSync(factoryDir, { recursive: true });
    const factoryContent = generateFactoryFile(parsed, opts.edge, mapping);
    const factoryFilePath = path.join(factoryDir, `zigbee-factory-${opts.edge}.ts`);
    fs.writeFileSync(factoryFilePath, factoryContent);
    console.log(`\n  📄 factory/zigbee-factory-${opts.edge}.ts (always regenerated)`);

    // Generate resource + view files
    const resourcesDir = path.join(opts.outputDir, "resources");
    const viewsDir = path.join(opts.outputDir, "views");
    fs.mkdirSync(resourcesDir, { recursive: true });
    fs.mkdirSync(viewsDir, { recursive: true });

    let newResources = 0;
    let newViews = 0;
    let skipped = 0;

    console.log("");

    for (const device of parsed) {
        const fileName = deviceToFileName(device.friendlyName);
        const resourceFile = `${fileName}.ts`;
        const viewFile = `${fileName}.ts`;
        const resourcePath = path.join(resourcesDir, resourceFile);
        const viewPath = path.join(viewsDir, viewFile);

        const prev = history[device.friendlyName];

        if (prev) {
            const resourceExists = fs.existsSync(resourcePath);
            const viewExists = fs.existsSync(viewPath);
            const hasMissing = !resourceExists || !viewExists;

            if (hasMissing && !opts.force) {
                const missing = [];
                if (!resourceExists) missing.push(`resources/${resourceFile}`);
                if (!viewExists) missing.push(`views/${viewFile}`);
                console.log(`  ⚠ ${device.friendlyName}: previously imported but ${missing.join(" and ")} removed. Use --force to regenerate.`);
                skipped++;
                continue;
            }

            if (!hasMissing) {
                console.log(`  ⏭ ${device.friendlyName}: already imported`);
                skipped++;
                continue;
            }

            // --force: fall through to regenerate missing files
        }

        // Generate resource file if missing
        if (fs.existsSync(resourcePath)) {
            console.log(`  ⏭ resources/${resourceFile} already exists`);
        } else {
            const resourceContent = generateResourceFile(device, opts.edge, mapping, opts.autoExport);
            fs.writeFileSync(resourcePath, resourceContent);
            console.log(`  📄 resources/${resourceFile} (${device.properties.length} resources)`);
            newResources++;
        }

        // Generate view file if missing
        if (fs.existsSync(viewPath)) {
            console.log(`  ⏭ views/${viewFile} already exists`);
        } else {
            const viewContent = generateViewFile(device, fileName);
            fs.writeFileSync(viewPath, viewContent);
            console.log(`  📄 views/${viewFile}`);
            newViews++;
        }

        // Record in history
        history[device.friendlyName] = { importedAt: new Date().toISOString(), resourceFile, viewFile };
    }

    // Warn about devices in history but no longer in Z2M
    const currentDeviceNames = new Set(parsed.map(d => d.friendlyName));
    for (const [name, entry] of Object.entries(history)) {
        if (!currentDeviceNames.has(name)) {
            console.log(`  ⚠ ${name}: in import history but no longer found in Z2M (was ${entry.resourceFile})`);
        }
    }

    // Save updated history
    saveHistory(history);

    console.log(`\n✅ Generated: ${newResources} resource files, ${newViews} view files, ${skipped} skipped`);

    // Edge config snippet
    const configDevices = generateEdgeConfig(parsed);
    const configJSON = JSON.stringify(configDevices, null, 4);
    const configPath = path.join(DATA_DIR, `edge-config-${opts.edge}.json`);
    fs.writeFileSync(configPath, configJSON + "\n");
    console.log(`\n📄 ${configPath}`);
    console.log(`\n--- Edge config snippet (add to zigbee[].devices) ---`);
    console.log(configJSON);
}

function savePerDeviceJSON(devices: Z2MDevice[], dataDir: string): void {
    for (const d of devices) {
        const filePath = path.join(dataDir, `${d.friendly_name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(d, null, 2) + "\n");
    }
    console.log(`  💾 Saved ${devices.length} device JSON files to ${dataDir}/\n`);
}

function loadHistory(): ImportHistory {
    const historyPath = path.join(Z2M_DIR, HISTORY_FILE);
    if (fs.existsSync(historyPath)) {
        try {
            return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
        } catch {
            return {};
        }
    }
    return {};
}

function saveHistory(history: ImportHistory): void {
    const historyPath = path.join(Z2M_DIR, HISTORY_FILE);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n");
}
