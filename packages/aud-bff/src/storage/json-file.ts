import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";

/** The content of a JSON file, or undefined when there is no such file or it is not JSON: the caller then starts from nothing. */
export const readJsonFile = async <T>(file: string): Promise<T | undefined> => {
    try {
        return JSON.parse(await readFile(file, "utf8")) as T;
    } catch {
        return undefined;
    }
};

/** Written pretty printed, so it can be read, and to a temporary file first, so a stop in the middle does not leave a damaged file. */
export const writeJsonFile = async (file: string, data: unknown): Promise<void> => {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(`${file}.tmp`, JSON.stringify(data, null, 2));
    await rename(`${file}.tmp`, file);
};
