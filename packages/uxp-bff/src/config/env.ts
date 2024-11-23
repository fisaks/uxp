const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const ENV = process.env.NODE_ENV === "prod" ? "prod" : 'dev';
const IsProd=ENV==="prod";
/**
 * Recursively searches for a `.env` file starting from the given directory and moving up.
 * @param startDir - The directory to start searching from.
 * @returns The full path to the `.env` file, or `null` if not found.
 */
function findEnvFile(startDir: string = __dirname): string | null {
    let currentDir = startDir;

    while (true) {
        const envPath = path.join(currentDir, `.env.${ENV}`);

        if (fs.existsSync(envPath)) {
            return envPath;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached the root directory
            break;
        }

        currentDir = parentDir;
    }

    return null;
}

// Locate and load the `.env` file
const envFile = findEnvFile();
if (envFile) {
    dotenv.config({ path: envFile });
    console.log(`Loaded environment variables from ${envFile}`);
} else {
    console.warn(`.env.${ENV} file not found!`);
}

module.exports = {
    ENV,
    IsProd
}; 
