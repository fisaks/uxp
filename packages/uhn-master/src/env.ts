import { envLoader } from "@uxp/bff-common";
import fs from "fs-extra";
envLoader(__dirname);

export const requiredKeys = [
    "MYSQL_UHN_DATABASE",
    "MYSQL_UHN_USER",
    "MYSQL_UHN_PASSWORD",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "JWT_SECRET",
    "UHN_FILE_UPLOAD_PATH",
    "UHN_MQTT_BROKER_URL",
] as const;
export const optionalKeys = [
    "LOG_LEVEL",
    "TZ",
] as const;
export type RequiredKeys = (typeof requiredKeys)[number];
export type OptionalKeys = (typeof optionalKeys)[number];
export type EnvVariables = Record<RequiredKeys, string> & Partial<Record<OptionalKeys, string>>;

function validateEnv(vars: EnvVariables): EnvVariables {
    const missingVars = requiredKeys.filter((key) => vars[key] === undefined);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    try {
        fs.ensureDirSync(vars.UHN_FILE_UPLOAD_PATH);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any        
    } catch (error: any) {
        throw new Error(`Failed to create directory at ${vars.UHN_FILE_UPLOAD_PATH}: ${error.message}`);
    }

    return vars;
}

// Validate and export environment variables

export default validateEnv(process.env as EnvVariables);
