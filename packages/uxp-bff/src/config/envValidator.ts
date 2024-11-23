type EnvVariables = {
  MYSQL_DATABASE: string;
  MYSQL_USER: string;
  MYSQL_PASSWORD: string;
  DATABASE_HOST: string;
  DATABASE_PORT: string;
};

/**
 * Validates that all required environment variables are set.
 * @param vars - The environment variables to validate.
 */
function validateEnv(vars: Partial<EnvVariables>): asserts vars is EnvVariables {
  const missingVars = Object.keys(vars).filter((key) => vars[key as keyof EnvVariables] === undefined);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
  }
}

// Validate and export environment variables
validateEnv(process.env as Partial<EnvVariables>);

const validatedEnv = process.env as EnvVariables;
module.exports = validatedEnv;
