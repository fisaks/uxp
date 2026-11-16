import { Route, Token } from "@uxp/bff-common";
import {
    UploadChunkQuery,
    UploadChunkSchema,
    UploadCreateRequest,
    UploadCreateSchema,
    UploadParams,
    UploadParamsSchema,
    UploadSession,
    UploadStatus,
} from "@vid/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "stream";
import { uploadService } from "../upload/upload.service";

/** Who is uploading, from the verified token. */
const ownerOf = (req: FastifyRequest): string => (req.user as Token).username;

export class UploadController {
    @Route("get", "/uploads/status", { authenticate: true })
    async getStatus(): Promise<UploadStatus> {
        return uploadService.status();
    }

    @Route("post", "/uploads", { authenticate: true, schema: UploadCreateSchema })
    async create(req: FastifyRequest<{ Body: UploadCreateRequest }>): Promise<UploadSession> {
        return uploadService.create(ownerOf(req), req.body);
    }

    /** Where the upload is, for resuming after a break. */
    @Route("get", "/uploads/:id", { authenticate: true, schema: UploadParamsSchema })
    async get(req: FastifyRequest<{ Params: UploadParams }>): Promise<UploadSession> {
        return uploadService.get(ownerOf(req), req.params.id);
    }

    /** One chunk, as the raw body (`application/octet-stream`), written at `offset`. */
    @Route("put", "/uploads/:id", { authenticate: true, schema: UploadChunkSchema })
    async putChunk(req: FastifyRequest<{ Params: UploadParams; Querystring: UploadChunkQuery }>): Promise<UploadSession> {
        return uploadService.append(ownerOf(req), req.params.id, req.query.offset, req.body as Readable);
    }

    @Route("delete", "/uploads/:id", { authenticate: true, schema: UploadParamsSchema })
    async abort(req: FastifyRequest<{ Params: UploadParams }>, reply: FastifyReply) {
        await uploadService.abort(ownerOf(req), req.params.id);
        return reply.code(204).send();
    }
}
