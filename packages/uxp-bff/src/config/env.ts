import { envLoader } from "@uxp/bff-common";

envLoader(__dirname);

export const requiredKeys = [
    "MYSQL_UXP_DATABASE",
    "MYSQL_UXP_USER",
    "MYSQL_UXP_PASSWORD",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "JWT_SECRET",
    "REMOTE_HOST_H2C",
    "REMOTE_HOST_DEMO",
    "SECURE_COOKIE",
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
