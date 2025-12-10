import path from "path";
import unzipper from "unzipper";
import { createWriteStream, ensureDir } from "./file.util";


export const extractZip = async (zipPath: string, targetDir: string) => {
    await ensureDir(targetDir);

    const directory = await unzipper.Open.file(zipPath);

    for (const file of directory.files) {
        const fullPath = path.join(targetDir, file.path);

        if (file.type === "Directory") {
            await ensureDir(fullPath);
            continue;
        }

        await ensureDir(path.dirname(fullPath));
        const readStream = file.stream();
        const writeStream = createWriteStream(fullPath);

        await new Promise<void>((resolve, reject) => {
            readStream.pipe(writeStream);
            readStream.on("error", reject);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });
    }
}
