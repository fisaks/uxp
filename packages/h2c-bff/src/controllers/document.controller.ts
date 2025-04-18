import { Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { GetDocumentSchema, GetVersionsSchema, RestoreDocumentVersionSchema } from "@h2c/common";
import { QueryRunner } from "typeorm";
import { DocumentService } from "../services/document.servcie";

export class DocumentController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("get", "/documents/:documentId/versions/:version", { authenticate: true, roles: ["user"], schema: GetDocumentSchema })
    @UseQueryRunner()
    async getDocument(req: FastifyRequest<{ Params: { documentId: string, version: number | 'snapshot' } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const documentService = new DocumentService(req, queryRunner);
        const { documentId, version } = req.params;
        const roles = (req.user as Token).roles
        const includeDeleted = (roles ?? []).includes("admin")
        const document = await documentService.getDocumentVersion(documentId, version, includeDeleted);

        reply.header("Content-Type", "application/octet-stream");
        if (document.name) reply.header("Content-Disposition", `attachment; filename="${document.name}"`);

        reply.header("X-Document-Version", `${version}`);
        reply.header("X-Document-Id", `${documentId}`);
        if (document.name) reply.header("X-Document-Name", document.name);
        reply.header("X-Document-Deleted", document.deleted ? "true" : "false");
        reply.header("X-Document-CreatedAt", document.createdAt.toUTC().toISO());
        if (document.removedAt) reply.header("X-Document-RemovedAt", document.removedAt.toUTC().toISO());
        reply.send(document.document);

    }
    @Route("get", "/documents/:documentId/versions", { authenticate: true, roles: ["user"], schema: GetVersionsSchema })
    @UseQueryRunner()
    async getVersions(req: FastifyRequest<{ Params: { documentId: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const documentService = new DocumentService(req, queryRunner);
        const { documentId } = req.params;
        const response = await documentService.getDocumentVersions(documentId)
        reply.send(response);
    }

    @Route("post", "/documents/:documentId/versions/:version/restore", { authenticate: true, roles: ["user"], schema: RestoreDocumentVersionSchema })
    @UseQueryRunner()
    async restoreDocumentVersion(req: FastifyRequest<{ Params: { documentId: string, version: number } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const documentService = new DocumentService(req, queryRunner);
        const { documentId, version } = req.params;
        const response = await documentService.restoreVersion(documentId, version);
        reply.send({ version: response });
    }
}