import { envLoader } from "@uxp/bff-common";
import fs from "fs-extra";
envLoader(__dirname);

export const requiredKeys = [
    "MYSQL_H2C_DATABASE",
    "MYSQL_H2C_USER",
    "MYSQL_H2C_PASSWORD",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "JWT_SECRET",
    "H2C_FILE_UPLOAD_PATH",

] as const;
export type RequiredKeys = (typeof requiredKeys)[number];
export type EnvVariables = Record<RequiredKeys, string>;

function validateEnv(vars: EnvVariables): EnvVariables {
    const missingVars = requiredKeys.filter((key) => vars[key] === undefined);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    try {
        fs.ensureDirSync(vars.H2C_FILE_UPLOAD_PATH);
    } catch (error: any) {
        throw new Error(`Failed to create directory at ${vars.H2C_FILE_UPLOAD_PATH}: ${error.message}`);
    }

    return vars;
}

// Validate and export environment variables

export default validateEnv(process.env as EnvVariables);
