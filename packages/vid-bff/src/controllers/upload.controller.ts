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

    /** The uploads of all users that are not done: stopped ones, ones being made ready and failed ones. */
    @Route("get", "/uploads", { authenticate: true })
    async list(): Promise<UploadSession[]> {
        return uploadService.list();
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

    /** One chunk, as the raw body (`application/octet-stream`), written at `offset`. The last chunk starts the making of the clip: the answer is then `processing`, and the result is pushed as `upload_state`. */
    @Route("put", "/uploads/:id", { authenticate: true, schema: UploadChunkSchema })
    async putChunk(req: FastifyRequest<{ Params: UploadParams; Querystring: UploadChunkQuery }>): Promise<UploadSession> {
        return uploadService.append(ownerOf(req), req.params.id, req.query.offset, req.body as Readable);
    }

    @Route("delete", "/uploads/:id", { authenticate: true, schema: UploadParamsSchema })
    async abort(req: FastifyRequest<{ Params: UploadParams }>, reply: FastifyReply) {
        await uploadService.abort(ownerOf(req), (req.user as Token).roles.includes("admin"), req.params.id);
        return reply.code(204).send();
    }
}
