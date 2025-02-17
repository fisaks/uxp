import { AppError, AppLogger, handleMultipartUpload, Route, sendErrorResponse } from "@uxp/bff-common";
import { getPublicFileName, SchemaValidate } from "@uxp/common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fromFile } from "file-type";
import fs from "fs-extra";
import path from "path";
import env from "../env";

const PreFlightFolder = path.join(env.DEMO_FILE_UPLOAD_PATH, ".pre-flight");
export const FileEntities = ["attachment"] as const;
export type FileEntityType = (typeof FileEntities)[number];
export type FileUploadResponse = { publicId: string; fileName: string };
export const FileGetSchema: SchemaValidate<undefined, undefined, { publicId: string }> = {
    params: {
        type: "object",
        properties: {
            publicId: { type: "string", minLength: 21, maxLength: 100, pattern: "^(?!\\.\\.)([a-zA-Z0-9_-]+(?:\\.[a-zA-Z0-9]+)?)$" },
        },
        required: ["publicId"],
    },
};
fs.ensureDirSync(env.DEMO_FILE_UPLOAD_PATH);
export class FileController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("post", "/file", { authenticate: true, roles: ["user"] })
    async upload(req: FastifyRequest, _reply: FastifyReply) {
        const files = await handleMultipartUpload<FileEntityType>(req, PreFlightFolder, FileEntities);
        const response: FileUploadResponse[] = [];
        const movedFiles: string[] = [];

        try {
            for await (const file of files.files) {
                const publicFolder = path.join(env.DEMO_FILE_UPLOAD_PATH, "upload");
                await fs.ensureDir(publicFolder);

                const publicFilePath = path.join(publicFolder, file.filename);

                await fs.move(file.filePath, publicFilePath, { overwrite: true });
                movedFiles.push(publicFilePath);



                response.push({ publicId: file.filename, fileName: getPublicFileName(file.filename) });
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

    async getFile(req: FastifyRequest<{ Params: { publicId: string } }>, reply: FastifyReply) {
        const { publicId } = req.params;

        const publicFile = path.join(env.DEMO_FILE_UPLOAD_PATH, "upload", publicId);

        if (!fs.pathExistsSync(publicFile)) {

            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `File not found ${publicId}`,
            });
        }
        if (!publicFile.startsWith(env.DEMO_FILE_UPLOAD_PATH,)) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 400,
                code: "VALIDATION",
                message: `Invalid file path`,
            });
        }

        const detectedFileType = await fromFile(publicFile);

        const fileMimeType = detectedFileType ? detectedFileType.mime : undefined;

        // 🚀 Stream the file to the client
        reply.header("Content-Type", fileMimeType ?? "application/octet-stream");
        reply.header("Content-Disposition", `inline; filename="${getPublicFileName(publicId)}"`);

        const stream = fs.createReadStream(publicFile);
        return reply.send(stream);
    }
}
