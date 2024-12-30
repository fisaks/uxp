import { envLoader } from "@uxp/bff-common";
import path from "path";

envLoader(path.join(__dirname, "../.."));

export const requiredKeys = [
    "MYSQL_DATABASE",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "JWT_SECRET",
] as const;
export type RequiredKeys = (typeof requiredKeys)[number];
export type EnvVariables = Record<RequiredKeys, string>;

function validateEnv(vars: EnvVariables): EnvVariables {
    const missingVars = requiredKeys.filter((key) => vars[key] === undefined);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }
    return vars;
}

// Validate and export environment variables

export default validateEnv(process.env as EnvVariables);
