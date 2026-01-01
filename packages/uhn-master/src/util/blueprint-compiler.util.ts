import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";

// --- Types ---
type BlueprintCompileOptions = {
    blueprintFolder: string; // e.g. /workspaces/uhn/blueprint
    identifier: string;
};

export type BlueprintCompileResult = {
    packageJsonPath: string;
    tsconfigJsonPath: string;
    installLog: string;
    compileLog: string;
    success: boolean;
    errorSummary?: string;
};

// --- Utilities ---
function getInstalledVersion(pkgName: string): string | undefined {
    try {
        const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkgJson = require(pkgJsonPath);
        return pkgJson.version as string;
    } catch {
        return undefined;
    }
}

function toValidNpmName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-._]/g, "-")
        .replace(/^-+/, "")
        .replace(/-+$/, "");
}

function extractErrorSummary(log: string): string {
    if (!log) return "Unknown error";
    // Look for the first line with "error", fallback to first non-empty line
    const lines = log.split("\n").map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
        if (/error/i.test(line)) return line.slice(0, 1000);
    }
    return lines[0]?.slice(0, 1000) || "Unknown error";
}

async function generatePackageJson(
    blueprintFolder: string,
    identifier: string,
    dependencies: Record<string, string>
): Promise<string> {
    const npmName = toValidNpmName(identifier);
    const packageJsonPath = path.join(blueprintFolder, "package.json");
    await fs.writeJson(packageJsonPath, {
        name: npmName,
        private: true,
        version: "1.0.0",
        type: "commonjs",
        dependencies
    }, { spaces: 2 });
    return packageJsonPath;
}

async function generateTsconfigJson(blueprintFolder: string): Promise<string> {
    const tsconfigJsonPath = path.join(blueprintFolder, "tsconfig.json");
    await fs.writeJson(tsconfigJsonPath, {
        compilerOptions: {
            outDir: "./dist",
            rootDir: "./src",
            module: "commonjs",
            target: "ES2021",
            esModuleInterop: true,
            strict: true,
            declaration: false,
            skipLibCheck: true,
            // TODO add ui feature to enable debug with source maps
            sourceMap: true,
            inlineSources: true
        },
        include: ["src/**/*"]
    }, { spaces: 2 });
    return tsconfigJsonPath;
}

function installDependencies(blueprintFolder: string): string | Error {
    try {
        return execSync("pnpm install --ignore-workspace", {
            cwd: blueprintFolder,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
        });
    } catch (err: any) {
        let errLog = "";
        if (err.stdout) errLog += `STDOUT:\n${err.stdout.toString()}\n`;
        if (err.stderr) errLog += `STDERR:\n${err.stderr.toString()}\n`;
        if (err.message) errLog += `ERROR:\n${err.message}\n`;
        return new Error(errLog);
    }
}

function compileTypescript(blueprintFolder: string): string | Error {
    try {
        return execSync("pnpm tsc --project tsconfig.json", {
            cwd: blueprintFolder,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"]
        });
    } catch (err: any) {
        let errLog = "";
        if (err.stdout) errLog += `STDOUT:\n${err.stdout.toString()}\n`;
        if (err.stderr) errLog += `STDERR:\n${err.stderr.toString()}\n`;
        if (err.message) errLog += `ERROR:\n${err.message}\n`;
        return new Error(errLog);
    }
}
async function compileBlueprint(options: BlueprintCompileOptions): Promise<BlueprintCompileResult> {
    const { blueprintFolder, identifier } = options;

    // 1. Find installed @uhn/blueprint
    let blueprintPkgRoot: string;
    try {
        blueprintPkgRoot = path.dirname(require.resolve("@uhn/blueprint/package.json"));
    } catch (err) {
        throw new Error("Could not resolve @uhn/blueprint from current process. Is it installed?");
    }

    // 2. Resolve exact versions for allowed deps
    function depVersion(pkg: string, fallback: string) {
        return getInstalledVersion(pkg) || fallback;
    }
    const allDeps = {
        "@uhn/blueprint": `file:${blueprintPkgRoot}`,
        "luxon": depVersion("luxon", "^3.5.0"),
        "nanoid": depVersion("nanoid", "^3.3.4"),
        "uuid": depVersion("uuid", "^11.0.3")
    };

    // 3. Generate package.json & tsconfig.json
    const packageJsonPath = await generatePackageJson(blueprintFolder, identifier, allDeps);
    const tsconfigJsonPath = await generateTsconfigJson(blueprintFolder);

    // 4. Install dependencies
    const installResult = installDependencies(blueprintFolder);
    const installLogPath = path.join(blueprintFolder, "install.log");
    let installLogText = typeof installResult === "string" ? installResult : installResult.message;
    await fs.writeFile(installLogPath, installLogText);

    if (installResult instanceof Error) {
        return {
            packageJsonPath,
            tsconfigJsonPath,
            installLog: installLogText,
            compileLog: "",
            success: false,
            errorSummary: extractErrorSummary(installLogText)
        };
    }

    // 5. Compile TypeScript
    const compileResult = compileTypescript(blueprintFolder);
    const compileLogPath = path.join(blueprintFolder, "compile.log");
    let compileLogText = typeof compileResult === "string" ? compileResult : compileResult.message;
    await fs.writeFile(compileLogPath, compileLogText);

    if (compileResult instanceof Error) {
        return {
            packageJsonPath,
            tsconfigJsonPath,
            installLog: installLogText,
            compileLog: compileLogText,
            success: false,
            errorSummary: extractErrorSummary(compileLogText)
        };
    }

    // 6. Success!
    return {
        packageJsonPath,
        tsconfigJsonPath,
        installLog: installLogText,
        compileLog: compileLogText,
        success: true
    };
}

export const BlueprintCompileUtil = {
    compileBlueprint
};
