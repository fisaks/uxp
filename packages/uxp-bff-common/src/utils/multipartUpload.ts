import { safeNormalizeFilename } from '@uxp/common';
import { FastifyRequest } from 'fastify';
import { fromFile } from 'file-type';
import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import path from 'path';
import { pipeline } from 'stream/promises';
import { AppError } from '../error/AppError';
import { AppLogger } from './AppLogger';
export interface UploadedFile {
    filePath: string;
    filename: string;
    publicId: string;
    mimetype?: string;
}

export interface UploadResult<Type = string> {
    files: UploadedFile[];
    fileType: Type;
}
const BlockedMimeTypes = [
    'application/x-msdownload',  // .exe
    'application/x-msdos-program', // .bat
    'application/x-sh', // Shell script
    'application/x-csh', // C shell script
    'application/javascript', // .js
    'application/x-python-code', // .py
    'application/x-httpd-php', // .php
    'application/x-java-archive', // .jar
    'application/x-dosexec' // Generic Windows executables
];

const readMimeTypeFromFile = async (req: FastifyRequest, filePath: string) => {

    try {
        return fromFile(filePath);
    } catch (error) {
        AppLogger.warn(req, {
            message: `File type detection failed for ${filePath}:`,
            error: error
        });

    }
    return undefined;
}
const removeFile = async (filePath: string) => {
    if (await fs.pathExists(filePath)) {
        await fs.unlink(filePath); // Delete empty file
    }
}
export const handleMultipartUpload = async <FileTypes>(
    req: FastifyRequest,
    PreFlightFolder: string,
    FileEntities: readonly FileTypes[]

): Promise<UploadResult<FileTypes>> => {
    const parts = req.parts();
    const files: UploadedFile[] = [];
    let fileType: FileTypes | undefined;

    for await (const part of parts) {
        if (part.type === 'file') {

            if (!part.file.readable || part.file.readableLength === 0) {
                throw new AppError(400, "VALIDATION", `File "${part.filename}" is empty and cannot be uploaded.`);
            }
            if (BlockedMimeTypes.includes(part.mimetype)) {
                throw new AppError(400, "VALIDATION", `Blocked file type: ${part.mimetype}`);
            }

            const safeFilename = safeNormalizeFilename(part.filename);
            const publicId = nanoid();
            const uniqueFilename = `${publicId}_${safeFilename}`;

            await fs.ensureDir(PreFlightFolder);
            const filePath = path.join(PreFlightFolder, uniqueFilename);

            await pipeline(part.file, fs.createWriteStream(filePath));

            const { size } = await fs.stat(filePath);
            if (size === 0) {
                await removeFile(filePath); // Delete empty file
                throw new AppError(400, "VALIDATION", 'File is empty after processing.',);
            }

            const detectedFileType = await readMimeTypeFromFile(req, filePath);

            const fileMimeType = detectedFileType ? detectedFileType.mime : part.mimetype;

            if (BlockedMimeTypes.includes(fileMimeType)) {
                await removeFile(filePath); // Delete empty file
                throw new AppError(400, "VALIDATION", `Blocked file type: ${fileMimeType}`);
            }

            files.push({ filePath, filename: uniqueFilename, publicId, mimetype: fileMimeType });
        } else if (part.type === 'field' && part.fieldname === 'type' && FileEntities.includes(part.value as FileTypes)) {
            fileType = part.value as FileTypes;
        }
    }
    if (fileType === undefined) {
        for await (const file of files) {
            await removeFile(file.filePath);
        }
        throw new AppError(400, "VALIDATION", 'File type not set.');
    }

    return { files, fileType };
};
