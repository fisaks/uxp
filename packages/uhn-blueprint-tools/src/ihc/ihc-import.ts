import fs from "fs";
import path from "path";
import { parseProjectFile } from "./project-parser";
import { downloadProject } from "./soap-download";
import { generateResourceFile, collectMappingKeys, locationToFileName } from "./resource-gen";
import { loadFactoryMapping, ensureMappingDefaults, saveFactoryMapping, loadPinOverrides } from "./factory-mapping";
import { translateLocation } from "./translation";
import type { IHCImportOptions, IHCProject } from "./types";

const IHC_DIR = ".ihc";
const DATA_DIR = ".ihc/data";
const HISTORY_FILE = "import-history.json";

type HistoryEntry = {
    importedAt: string;
    resourceFile: string;
    resourceCount: number;
};

type ImportHistory = Record<string, HistoryEntry>; // key: "locationName-controller"

export async function ihcImport(opts: IHCImportOptions): Promise<void> {
    // Resolve or download the project XML
    const projectFilePath = await resolveProjectXmlPath(opts);

    // Parse the project
    console.log("Parsing IHC project...");
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const project = parseProjectFile(projectFilePath);

    // Save parsed data
    const parsedPath = path.join(DATA_DIR, `${opts.controller}-parsed.json`);
    fs.writeFileSync(parsedPath, JSON.stringify(project, null, 2) + "\n");

    console.log(`Found ${project.groups.length} location(s):\n`);
    for (const group of project.groups) {
        const english = translateLocation(group.name);
        const ioCount = group.products.reduce((sum, p) => sum + p.ios.length, 0);
        console.log(`  ${group.name} -> ${english} (${group.products.length} products, ${ioCount} I/O)`);
    }

    // Load/update factory mapping
    const mapping = loadFactoryMapping();
    const usedKeys = collectMappingKeys(project.groups);
    ensureMappingDefaults(mapping, usedKeys);
    saveFactoryMapping(mapping);

    if (opts.mappingOnly) {
        console.log(`\nFactory mapping updated (--mapping-only). Review .ihc/factory-mapping.json and .ihc/pin-mapping.json, then run without --mapping-only to generate files.`);
        return;
    }

    // Load pin-level overrides (factory, icon, name — all optional per pin)
    const pinOverrides = loadPinOverrides();

    // Load exclusion list
    const excludes = loadExcludes();

    // Generate resource files per location
    const resourcesDir = path.join(opts.outputDir, "resources");
    fs.mkdirSync(resourcesDir, { recursive: true });

    const history = loadHistory();
    let newFiles = 0;
    let skipped = 0;

    console.log("");

    for (const group of project.groups) {
        // Check location exclusion
        if (excludes.locations?.includes(group.name)) {
            console.log(`  skip ${group.name} (excluded by location)`);
            skipped++;
            continue;
        }

        const fileName = locationToFileName(group.name, opts.controller);
        const resourceFile = `${fileName}.ts`;
        const resourcePath = path.join(resourcesDir, resourceFile);
        const historyKey = `${group.name}-${opts.controller}`;

        const prev = history[historyKey];
        if (prev && fs.existsSync(resourcePath) && !opts.force) {
            console.log(`  skip ${resourceFile} (already imported)`);
            skipped++;
            continue;
        }

        if (prev && !fs.existsSync(resourcePath) && !opts.force) {
            console.log(`  warn ${resourceFile}: previously imported but file removed. Use --force to regenerate.`);
            skipped++;
            continue;
        }

        // Before overwriting, collect previously exported pins from the existing file
        const exportedPins = fs.existsSync(resourcePath)
            ? collectExportedPins(fs.readFileSync(resourcePath, "utf-8"))
            : new Set<string>();

        let content = generateResourceFile(group, opts.controller, opts.edge, mapping, pinOverrides, opts.autoExport, excludes.pinsSet);
        if (!content) {
            console.log(`  skip ${group.name}: no mappable I/O elements`);
            continue;
        }

        // Re-apply exports for pins that were previously exported
        if (exportedPins.size > 0) {
            content = reapplyExports(content, exportedPins);
        }

        fs.writeFileSync(resourcePath, content);
        const resourceCount = (content.match(/\bconst \w+ = /g) || []).length;
        const exportedCount = (content.match(/\bexport const \w+ = /g) || []).length;
        console.log(`  wrote resources/${resourceFile} (${resourceCount} resources, ${exportedCount} exported)`);
        newFiles++;

        history[historyKey] = {
            importedAt: new Date().toISOString(),
            resourceFile,
            resourceCount,
        };
    }

    saveHistory(history);

    console.log(`\nGenerated: ${newFiles} resource files, ${skipped} skipped`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review generated files in ${resourcesDir}/`);
    console.log(`  2. Edit .ihc/factory-mapping.json to customize factory functions`);
    console.log(`  3. Add 'export' to resources you want to activate`);
    console.log(`  4. Run 'pnpm typecheck' to verify`);
}

/**
 * Resolves the project XML file path — either a local file or downloaded via SOAP.
 * When downloading, saves to .ihc/data/ and returns the saved path.
 */
async function resolveProjectXmlPath(opts: IHCImportOptions): Promise<string> {
    if (opts.file) {
        if (!fs.existsSync(opts.file)) {
            throw new Error(`File not found: ${opts.file}`);
        }
        console.log(`Reading project file: ${opts.file}`);
        return opts.file;
    }

    // Download via SOAP
    if (!opts.host) {
        throw new Error("Either --file or --host is required");
    }
    if (!opts.username || !opts.password) {
        throw new Error("--username and --password are required for SOAP download");
    }

    console.log(`Downloading project from ${opts.host}:${opts.port}...`);
    const buffer = await downloadProject(opts.host, opts.port, opts.username, opts.password);

    fs.mkdirSync(DATA_DIR, { recursive: true });
    const projectFilePath = path.join(DATA_DIR, `${opts.controller}-project.xml`);
    fs.writeFileSync(projectFilePath, buffer);
    console.log(`  Saved to ${projectFilePath}`);
    return projectFilePath;
}

/**
 * Scans a generated resource file for exported pins.
 * Returns a set of hex pin strings (e.g. "0x7B495B") that were exported.
 */
function collectExportedPins(content: string): Set<string> {
    const pins = new Set<string>();
    const re = /^export const \w+ = \w+\(\{[^}]*pin:\s*(0x[A-F0-9]+)/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
        pins.add(m[1]);
    }
    return pins;
}

/**
 * Re-applies `export` keyword to resources whose pin matches the exported set.
 */
function reapplyExports(content: string, exportedPins: Set<string>): string {
    return content.replace(
        /^(const \w+ = \w+\(\{[^}]*pin:\s*(0x[A-F0-9]+))/gm,
        (match, full, pin) => {
            if (exportedPins.has(pin)) {
                return "export " + full;
            }
            return match;
        },
    );
}

type ExcludeConfig = {
    locations?: string[];
    pins?: string[];
    pinsSet?: Set<string>;
};

const EXCLUDE_FILE = "exclude.json";

function loadExcludes(): ExcludeConfig {
    const excludePath = path.join(IHC_DIR, EXCLUDE_FILE);
    if (fs.existsSync(excludePath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(excludePath, "utf-8")) as ExcludeConfig;
            raw.pinsSet = new Set(raw.pins ?? []);
            return raw;
        } catch {
            return {};
        }
    }
    return {};
}

function loadHistory(): ImportHistory {
    const historyPath = path.join(IHC_DIR, HISTORY_FILE);
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
    fs.mkdirSync(IHC_DIR, { recursive: true });
    const historyPath = path.join(IHC_DIR, HISTORY_FILE);
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + "\n");
}
