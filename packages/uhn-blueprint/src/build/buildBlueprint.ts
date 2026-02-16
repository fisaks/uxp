import archiver from "archiver";
import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { normalizeBlueprint } from "./normalizeBlueprint";
import { resolveExecutionTargets } from "./resolveExecutionTargets";
import { validateBlueprintFactories } from "./validateBlueprintFactories";
import { validateBlueprintMetadata } from "./validateBlueprintMetadata";

export async function buildBlueprint(projectRoot: string): Promise<string> {
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
    // 2) Copy source to temp folder (excluding resources and rules)
    await fs.copy(srcDir, tmpSrc, {
        filter: p => {
            const rel = path.relative(srcDir, p);
            // Outside srcDir → skip
            if (rel.startsWith("..") || path.isAbsolute(rel)) {
                return false;
            }

            // skip resources and rules completely
            if (
                rel === "resources" ||
                rel.startsWith(`resources${path.sep}`) ||
                rel === "rules" ||
                rel.startsWith(`rules${path.sep}`)
            ) {
                return false;
            }

            return p.endsWith(".ts") || fs.lstatSync(p).isDirectory();
        },
    });
    if (!await fs.pathExists(factoryTmp)) {
        throw new Error(`Factory folder was not copied to temp: ${factoryTmp}`);
    }
    // 3) Normalize resources and rules into temp folder
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

    // 3.5) Resolve and inject execution targets
    await resolveExecutionTargets({
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
