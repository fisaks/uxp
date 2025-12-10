import fs from "fs-extra";
import path from 'path';

export async function ensureDir(dir: string) {
    await fs.ensureDir(dir);
    return dir;
}

export async function moveFile(src: string, dest: string) {
    await ensureDir(path.dirname(dest));
    await fs.move(src, dest, { overwrite: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
}

export async function removeFile(filePath: string) {
    if (await fs.pathExists(filePath)) {
        await fs.unlink(filePath);
    }
}
export async function removeFiles(filePaths: string[]) {
    await Promise.all(filePaths.map(removeFile));
}

export const pathExists = fs.pathExists;

export const readFile = fs.readFile;
export const writeFile = fs.writeFile;

export const createReadStream = fs.createReadStream;
export const createWriteStream = fs.createWriteStream;