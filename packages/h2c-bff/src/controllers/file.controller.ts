import { FileGetSchema } from "@h2c/common";
import { Route, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { FileUploadService } from "../services/fileUpload.service";

export class FileController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("post", "/file", { authenticate: true, roles: ["user"] })
    @UseQueryRunner({ transactional: true })
    async upload(req: FastifyRequest, _reply: FastifyReply, queryRunner: QueryRunner) {
        const fileUploadService = new FileUploadService(req, queryRunner);
        return await fileUploadService.uploadFiles(req);
    }

    @Route("get", "/file/:publicId", { authenticate: true, roles: ["user"], schema: FileGetSchema })
    @UseQueryRunner()
    async getFile(
        req: FastifyRequest<{
            Params: { publicId: string };
        }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { publicId } = req.params;
        const fileUploadService = new FileUploadService(req, queryRunner);

        const { mimeType, publicFileName, stream } = await fileUploadService.getFile(publicId);

        // 🚀 Stream the file to the client
        reply.header("Content-Type", mimeType);
        reply.header("Content-Disposition", `inline; filename="${publicFileName}"`);

        return reply.send(stream);
    }
}
