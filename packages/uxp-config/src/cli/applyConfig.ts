import fs from "fs";
import path from "path";
import { SerializablePlatformConfig } from "../serializable";

type ProfileConfig = {
    url?: string;
    key?: string;
};

type CliConfigFile = {
    defaultProfile?: string;
    profiles?: Record<string, ProfileConfig>;
};

type ApplyOptions = {
    key?: string;
    url?: string;
    profile?: string;
    configPackage?: string;
};

function readCliConfig(profileName?: string): ProfileConfig {
    const configPath = path.join(
        process.env.HOME ?? process.env.USERPROFILE ?? "~",
        ".uxp",
        "config.json",
    );

    const configDir = path.dirname(configPath);

    let file: CliConfigFile;
    try {
        const dirStat = fs.statSync(configDir);
        const dirMode = dirStat.mode & 0o777;
        if (dirMode !== 0o700) {
            console.warn(`Warning: ${configDir} has mode ${dirMode.toString(8)}, expected 700. Fix with: chmod 700 ${configDir}`);
        }

        const fileStat = fs.statSync(configPath);
        const fileMode = fileStat.mode & 0o777;
        if (fileMode !== 0o600) {
            console.warn(`Warning: ${configPath} has mode ${fileMode.toString(8)}, expected 600. Fix with: chmod 600 ${configPath}`);
        }

        const raw = fs.readFileSync(configPath, "utf-8");
        file = JSON.parse(raw) as CliConfigFile;
    } catch (err: any) {
        if (err?.code === "ENOENT") return {};
        throw err;
    }

    const name = profileName ?? file.defaultProfile;
    if (!name || !file.profiles?.[name]) {
        return {};
    }

    return file.profiles[name];
}

export async function applyConfig(opts: ApplyOptions): Promise<void> {
    const profile = readCliConfig(opts.profile);

    const url = opts.url ?? profile.url ?? "http://localhost:3001";
    const key = opts.key ?? profile.key;
    const configPackage = opts.configPackage ?? "@uxp/config-dev";

    if (!key) {
        throw new Error(
            "API key is required. Provide --key flag or set it in ~/.uxp/config.json",
        );
    }

    console.log(`Loading config from ${configPackage}...`);

    let config: SerializablePlatformConfig;
    try {
        const mod = await import(configPackage);
        config = mod.default ?? mod;
    } catch (err: any) {
        throw new Error(`Failed to import config package "${configPackage}": ${err?.message ?? err}`);
    }

    const applyUrl = `${url}/api/system/apply-config`;
    console.log(`Applying config to ${applyUrl}...`);

    let response: Response;
    try {
        response = await fetch(applyUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
            },
            body: JSON.stringify(config),
        });
    } catch (err: any) {
        throw new Error(`Could not connect to ${url}: ${err?.message ?? err}`);
    }

    if (!response.ok) {
        let message = `Apply failed (HTTP ${response.status})`;
        try {
            const body = await response.json() as any;
            if (body.errors?.[0]?.message) {
                message = body.errors[0].message;
            } else if (body.message) {
                message = body.message;
            }
        } catch {
            // response body not JSON
        }
        throw new Error(message);
    }

    const result = await response.json() as {
        success: boolean;
        stats: Record<string, number>;
    };

    console.log("Config applied successfully!");
    console.log("Stats:");
    for (const [entity, count] of Object.entries(result.stats)) {
        console.log(`  ${entity}: ${count}`);
    }
}
