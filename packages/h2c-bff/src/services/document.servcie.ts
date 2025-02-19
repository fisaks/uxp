import { DocumentType } from "@h2c/common";
import { FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { DocumentEntity } from "../db/entities/DocumentEntity";


export class DocumentService {
    private queryRunner: QueryRunner;
    private request: FastifyRequest;
    constructor(request: FastifyRequest, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.request = request;
    }


    /**
     * Creates a new document with a generated documentId.
     * @param documentType The type of document being created.
     * @returns The created document entity.
     */
    async createDocument(documentType: DocumentType, name?: string): Promise<DocumentEntity> {
        const docRepo = this.queryRunner.manager.getRepository(DocumentEntity);
        return docRepo.save(new DocumentEntity({
            documentType, content: {}, name
        }));
    }
}
