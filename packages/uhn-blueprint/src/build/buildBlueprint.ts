import archiver from "archiver";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { normalizeBlueprint } from "./normalizeBlueprint";
import { resolveEmitsTap } from "./resolveEmitsTap";
import { resolveExecutionTargets } from "./resolveExecutionTargets";
import { validateBlueprintFactories } from "./validateBlueprintFactories";
import { validateBlueprintMetadata } from "./validateBlueprintMetadata";

export async function buildBlueprint(projectRoot: string, options?: { devFilter?: string }): Promise<string> {
    const distDir = path.join(projectRoot, "dist");
    const tempDir = path.join(distDir, "blueprint-tmp");

    await fs.remove(distDir);
    await fs.ensureDir(tempDir);

    const srcDir = path.join(projectRoot, "src");
    const tmpSrc = path.join(tempDir, "src");
    const resourcesSrc = path.join(srcDir, "resources");
    const resourcesTmp = path.join(tmpSrc, "resources");
    const rulesSrc = path.join(srcDir, "rules");
    const rulesTmp = path.join(tmpSrc, "rules");
    const viewsSrc = path.join(srcDir, "views");
    const viewsTmp = path.join(tmpSrc, "views");
    const locationsSrc = path.join(srcDir, "locations");
    const locationsTmp = path.join(tmpSrc, "locations");
    const scenesSrc = path.join(srcDir, "scenes");
    const scenesTmp = path.join(tmpSrc, "scenes");
    const schedulesSrc = path.join(srcDir, "schedules");
    const schedulesTmp = path.join(tmpSrc, "schedules");
    const factorySrc = path.join(srcDir, "factory");
    const factoryTmp = path.join(tmpSrc, "factory");
    const tsconfigPath = path.join(projectRoot, "tsconfig.json");

    // 1) Type-check ORIGINAL source (noEmit) and basic validation
    execSync("pnpm tsc --project tsconfig.json --noEmit", {
        cwd: projectRoot,
        stdio: "inherit",
    });

    if (!await fs.pathExists(factorySrc)) {
        throw new Error(`Factory file not found at expected location: ${factorySrc}`);
    }
    if (!await fs.pathExists(rulesSrc)) {
        throw new Error(`Rules folder not found at expected location: ${rulesSrc}`);
    }
    if (!await fs.pathExists(resourcesSrc)) {
        throw new Error(`Resources folder not found at expected location: ${resourcesSrc}`);
    }
    validateBlueprintMetadata(projectRoot);
    validateBlueprintFactories({
        srcRoot: srcDir,
        tsconfigPath: tsconfigPath,
        factoryPath: factorySrc,
    });
    // 2) Copy source to temp folder (excluding entity directories that get normalized separately)
    await fs.copy(srcDir, tmpSrc, {
        filter: p => {
            const rel = path.relative(srcDir, p);
            // Outside srcDir → skip
            if (rel.startsWith("..") || path.isAbsolute(rel)) {
                return false;
            }

            // skip entity directories — they are normalized separately in step 3
            if (
                rel === "resources" ||
                rel.startsWith(`resources${path.sep}`) ||
                rel === "rules" ||
                rel.startsWith(`rules${path.sep}`) ||
                rel === "views" ||
                rel.startsWith(`views${path.sep}`) ||
                rel === "locations" ||
                rel.startsWith(`locations${path.sep}`) ||
                rel === "scenes" ||
                rel.startsWith(`scenes${path.sep}`) ||
                rel === "schedules" ||
                rel.startsWith(`schedules${path.sep}`) ||
                rel === "dev-filters" ||
                rel.startsWith(`dev-filters${path.sep}`)
            ) {
                return false;
            }

            return p.endsWith(".ts") || fs.lstatSync(p).isDirectory();
        },
    });
    if (!await fs.pathExists(factoryTmp)) {
        throw new Error(`Factory folder was not copied to temp: ${factoryTmp}`);
    }
    // 3) Normalize all entity types into temp folder
    await normalizeBlueprint({
        sourceDir: resourcesSrc,
        targetDir: resourcesTmp,
        tsconfigPath: tsconfigPath,
        factoryPath: factoryTmp,
        mode: "resource",
    });

    await normalizeBlueprint({
        sourceDir: rulesSrc,
        targetDir: rulesTmp,
        tsconfigPath: tsconfigPath,
        mode: "rule",
    });

    // 3b) Normalize views (optional — build succeeds without src/views/)
    if (await fs.pathExists(viewsSrc)) {
        await normalizeBlueprint({
            sourceDir: viewsSrc,
            targetDir: viewsTmp,
            tsconfigPath: tsconfigPath,
            mode: "view",
        });
    }

    // 3c) Normalize locations (optional — build succeeds without src/locations/)
    if (await fs.pathExists(locationsSrc)) {
        await normalizeBlueprint({
            sourceDir: locationsSrc,
            targetDir: locationsTmp,
            tsconfigPath: tsconfigPath,
            mode: "location",
        });
    }

    // 3d) Normalize scenes (optional — build succeeds without src/scenes/)
    if (await fs.pathExists(scenesSrc)) {
        await normalizeBlueprint({
            sourceDir: scenesSrc,
            targetDir: scenesTmp,
            tsconfigPath: tsconfigPath,
            mode: "scene",
        });
    }

    // 3e) Normalize schedules (optional — build succeeds without src/schedules/)
    if (await fs.pathExists(schedulesSrc)) {
        await normalizeBlueprint({
            sourceDir: schedulesSrc,
            targetDir: schedulesTmp,
            tsconfigPath: tsconfigPath,
            mode: "schedule",
        });
    }

    // 3f) Copy dev filter preset to temp (if specified)
    if (options?.devFilter) {
        const filterSrc = path.join(srcDir, "dev-filters", `${options.devFilter}.ts`);
        if (!await fs.pathExists(filterSrc)) {
            throw new Error(`Dev filter preset not found: ${filterSrc}`);
        }
        const filterDst = path.join(tmpSrc, "dev-filters", "dev-filter.ts");
        await fs.ensureDir(path.dirname(filterDst));
        await fs.copyFile(filterSrc, filterDst);
    }

    // 3.5) Resolve and inject execution targets
    await resolveExecutionTargets({
        resourcesTmpDir: resourcesTmp,
        rulesTmpDir: rulesTmp,
        tsconfigPath,
        factoryTmpPath: factoryTmp,
        scenesTmpDir: await fs.pathExists(scenesTmp) ? scenesTmp : undefined,
    });

    // 3.6) Auto-inject emitsTap on complex resources used in .onTap() triggers
    await resolveEmitsTap({
        resourcesTmpDir: resourcesTmp,
        rulesTmpDir: rulesTmp,
        tsconfigPath,
        factoryTmpPath: factoryTmp,
    });

    // 4) Copy blueprint.json
    await fs.copyFile(
        path.join(projectRoot, "blueprint.json"),
        path.join(tmpSrc, "blueprint.json")
    );

    // 5) Zip
    const zipPath = path.join(distDir, "blueprint.zip");
    await zipDirectory(tmpSrc, zipPath);


    return zipPath;
}

function zipDirectory(src: string, out: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(out);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", reject);
        output.on("close", resolve);

        archive.pipe(output);
        archive.directory(src, false);
        archive.finalize();
    });
}
