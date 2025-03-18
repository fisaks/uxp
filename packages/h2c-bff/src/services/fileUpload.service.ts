import { FileEntities, FileEntityType, FileUploadResponse } from "@h2c/common";
import { AppErrorV2, AppLogger, handleMultipartUpload, RequestMetaData } from "@uxp/bff-common";
import { getPublicFileName } from "@uxp/common";
import { FastifyRequest } from "fastify";
import fs from "fs-extra";
import path from "path";
import { QueryRunner } from "typeorm";
import { FileUploadEntity } from "../db/entities/FileUploadEntity";
import env from "../env";

const PreFlightFolder = path.join(env.H2C_FILE_UPLOAD_PATH, ".pre-flight");

export class FileUploadService {

    private queryRunner: QueryRunner;
    private requestMeta: RequestMetaData;
    constructor(requestMeta: FastifyRequest | RequestMetaData, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;
    }


    async uploadFiles(request: FastifyRequest) {
        const files = await handleMultipartUpload<FileEntityType>(request, PreFlightFolder, FileEntities);
        const fileRepo = this.queryRunner.manager.getRepository(FileUploadEntity);
        const response: FileUploadResponse[] = [];
        const movedFiles: string[] = [];
        try {
            for await (const file of files.files) {
                const publicFolder = path.join(env.H2C_FILE_UPLOAD_PATH, files.fileType);
                await fs.ensureDir(publicFolder);

                const publicFilePath = path.join(publicFolder, file.filename);

                await fs.move(file.filePath, publicFilePath, { overwrite: true });
                movedFiles.push(publicFilePath);

                const fileEntity = new FileUploadEntity({
                    publicId: file.publicId,
                    entityType: files.fileType,
                    fileName: file.filename,
                    filePath: publicFilePath,
                    fileMimeType: file.mimetype,
                });
                const newFileEntity = await fileRepo.save(fileEntity);

                AppLogger.info(this.requestMeta, {
                    message: `Uploaded file ${file.filename} with public id ${file.publicId} and internal id ${newFileEntity.id}`,
                });
                response.push({ publicId: newFileEntity.publicId, fileName: getPublicFileName(newFileEntity.fileName) });
            }
        } catch (error) {
            AppLogger.error(this.requestMeta, {
                message: "File upload failed, doing rollback",
                error: error,
            });
            await this.rollbackUploadedFiles(movedFiles);
            throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "File upload failed", originalError: error as Error });
        }

        return response.length === 1 ? response[0] : response
    }

    private async rollbackUploadedFiles(files: string[]) {
        await Promise.all(
            files.map(async (filePath) => {
                if (await fs.pathExists(filePath)) {
                    await fs.unlink(filePath);
                }
            })
        );
    }

    async getFile(publicId: string) {
        const fileRepo = this.queryRunner.manager.getRepository(FileUploadEntity);

        // 🔍 Find the file in the database
        const fileEntity = await fileRepo.findOne({ where: { publicId } });
        if (!fileEntity) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "NOT_FOUND",
                message: `File not found ${publicId}`,
            });
        }

        // 🔎 Check if file exists
        if (!(await fs.pathExists(fileEntity.filePath))) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "NOT_FOUND",
                message: `File not found on disk ${publicId}`,
            });
        }
        const mimeType = fileEntity.fileMimeType ?? "application/octet-stream";
        const publicFileName = getPublicFileName(fileEntity.fileName);
        return {
            mimeType,
            publicFileName,
            stream: fs.createReadStream(fileEntity.filePath)
        }
    }
}
