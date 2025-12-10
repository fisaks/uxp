import { BlueprintMetadata, BlueprintMetadataSchema } from '@uhn/common';
import { AppErrorV2, ensureDir, writeFile } from '@uxp/bff-common';
import Ajv from 'ajv';
import fs, { lstat } from 'fs';
import path from 'path';
import { ModuleKind, ModuleResolutionKind, Project, ScriptTarget } from 'ts-morph';
import unzipper from 'unzipper';
import { analyzeBlueprintDependencies } from './blueprint-deps.util';
import { writeJson } from 'fs-extra';

const ajv = new Ajv({
    allErrors: true,
    strict: false,
});

const validateBlueprintMetadataAjv = ajv.compile(BlueprintMetadataSchema);

export function validateBlueprintMetadata(data: unknown): BlueprintMetadata {
    if (!validateBlueprintMetadataAjv(data)) {
        const errorText = ajv.errorsText(validateBlueprintMetadataAjv.errors, {
            separator: "; ",
        });

        throw new AppErrorV2({
            statusCode: 400,
            code: "BLUEPRINT_JSON_VALIDATION_FAILED",
            message: `Invalid blueprint metadata: ${errorText}`,
            params: { errors: errorText }
        });
    }

    return data as BlueprintMetadata;
}


export async function readBlueprintMetadataFromZip(zipPath: string): Promise<BlueprintMetadata> {
    const directory = await unzipper.Open.file(zipPath);

    const entry = directory.files.find(f => f.path === 'blueprint.json');
    if (!entry) {
        throw new AppErrorV2({
            statusCode: 400,
            code: "MISSING_BLUEPRINT_JSON",
            message: 'Missing blueprint.json in blueprint zip'
        });
    }
    const content = await entry.buffer();
    let raw: unknown;
    try {
        raw = JSON.parse(content.toString("utf-8"));
    } catch (err) {
        throw new AppErrorV2({
            statusCode: 400,
            code: "BLUEPRINT_JSON_INVALID",
            message: "blueprint.json is not valid JSON",
        });
    }
    return validateBlueprintMetadata(raw);

}

export async function compileBlueprint(sourceDir: string, outDir: string) {
    await ensureDir(outDir);

    const project = new Project({
        compilerOptions: {
            outDir,
            rootDir: sourceDir,

            strict: true,
            noUncheckedIndexedAccess: true,
            noImplicitOverride: true,
            noFallthroughCasesInSwitch: true,
            exactOptionalPropertyTypes: true,

            module: ModuleKind.CommonJS,
            target: ScriptTarget.ES2020,
            moduleResolution: ModuleResolutionKind.Node10,
            declaration: false,
            sourceMap: false,
            removeComments: true,

            isolatedModules: false,
            skipLibCheck: true,
            resolveJsonModule: true,
            esModuleInterop: true,

            moduleDetection: 3, // Force
            allowSyntheticDefaultImports: true,
            forceConsistentCasingInFileNames: true,

            allowJs: false,
            types: [],
            //lib: [ "es2020" , "dom"],
            lib: [resolveTypeScriptLib("es2020"),
            resolveTypeScriptLib("dom")],
            noEmitOnError: false,


        },

    });

    project.addSourceFilesAtPaths(path.join(sourceDir, "**/*.ts"));

    const diagnostics = project.getPreEmitDiagnostics();
    if (diagnostics.length > 0) {
        throw new Error(project.formatDiagnosticsWithColorAndContext(diagnostics));
    }

    const emitResult = await project.emit();

    const emitDiagnostics = emitResult.getDiagnostics();
    if (emitDiagnostics.length > 0) {
        throw new Error(project.formatDiagnosticsWithColorAndContext(emitDiagnostics));
    }

    // Extract dependencies → deps.json

    const deps = analyzeBlueprintDependencies(project, sourceDir);

    const depsPath = path.join(outDir, "deps.json");
    await ensureDir(outDir);
    await writeJson(depsPath, deps, { spaces: 2 });

}

export function resolveTypeScriptLib(lib: string): string {
    const tryPaths = [
        // PNPM virtual store path
        path.join(
            path.dirname(require.resolve("typescript")),
            "lib",
            `lib.${lib.toLowerCase()}.d.ts`
        ),

        // Node module fallback (non-pnpm)
        path.join(
            path.dirname(require.resolve("typescript/package.json")),
            "lib",
            `lib.${lib.toLowerCase()}.d.ts`
        ),
    ];

    for (const p of tryPaths) {
        if (fs.existsSync(p)) {
            return p;
        } lstat
    }

    throw new Error(`Cannot resolve TypeScript lib for: ${lib}`);
}