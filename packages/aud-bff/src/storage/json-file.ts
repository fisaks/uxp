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

/** Writes a JSON file after the writes that are already waiting, so a burst of changes ends in the file with the last one. */
export class SerializedJsonWriter {
    private writing: Promise<void> = Promise.resolve();

    constructor(
        private readonly file: string,
        private readonly onError: (error: unknown) => void
    ) {}

    write(data: unknown): Promise<void> {
        this.writing = this.writing.then(() => writeJsonFile(this.file, data)).catch(this.onError);
        return this.writing;
    }
}
