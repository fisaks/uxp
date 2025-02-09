import { FileEntities, FileEntityType, FileGetSchema, FileUploadResponse } from "@h2c/common";
import { AppError, AppLogger, handleMultipartUpload, Route, sendErrorResponse, UseQueryRunner } from "@uxp/bff-common";
import { getPublicFileName } from "@uxp/common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fs from "fs-extra";
import path from "path";
import { QueryRunner } from "typeorm";
import { FileUploadEntity } from "../db/entities/FileUploadEntity";
import env from "../env";

const PreFlightFolder = path.join(env.H2C_FILE_UPLOAD_PATH, ".pre-flight");

export class FileController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("post", "/file", { authenticate: true, roles: ["user"] })
    @UseQueryRunner({ transactional: true })
    async upload(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const files = await handleMultipartUpload<FileEntityType>(req, PreFlightFolder, FileEntities);
        const fileRepo = queryRunner.manager.getRepository(FileUploadEntity);
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

                AppLogger.info(req, {
                    message: `Uploaded file ${file.filename} with public id ${file.publicId} and internal id ${newFileEntity.id}`,
                });
                response.push({ publicId: newFileEntity.publicId, fileName: getPublicFileName(newFileEntity.fileName) });
            }
        } catch (error) {
            AppLogger.error(req, {
                message: "File upload failed doing rollback",
                error: error,
            });
            await Promise.all(
                movedFiles.map(async (filePath) => {
                    if (await fs.pathExists(filePath)) {
                        await fs.unlink(filePath);
                    }
                })
            );

            throw new AppError(500, "INTERNAL_SERVER_ERROR", "File upload failed", undefined, error as Error);
        }

        return response.length === 1 ? { publicId: response[0].publicId, fileName: response[0].fileName } : response;
    }

    @Route("get", "/file/:publicId", { authenticate: true, roles: ["user"], schema: FileGetSchema })
    @UseQueryRunner()
    async getFile(req: FastifyRequest<{ Params: { publicId: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { publicId } = req.params;
        const fileRepo = queryRunner.manager.getRepository(FileUploadEntity);

        // 🔍 Find the file in the database
        const fileEntity = await fileRepo.findOne({ where: { publicId } });
        if (!fileEntity) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `File not found ${publicId}`,
            });
        }

        // 🔎 Check if file exists
        if (!(await fs.pathExists(fileEntity.filePath))) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `File not found on disk ${publicId}`,
            });
        }

        // 🚀 Stream the file to the client
        reply.header("Content-Type", fileEntity.fileMimeType ?? "application/octet-stream");
        reply.header("Content-Disposition", `inline; filename="${getPublicFileName(fileEntity.fileName)}"`);

        const stream = fs.createReadStream(fileEntity.filePath);
        return reply.send(stream);
    }
}
