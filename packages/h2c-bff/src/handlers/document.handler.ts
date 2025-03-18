import { DocumentIdSchema, H2CAppRequestMessage } from "@h2c/common";
import { UseQueryRunner, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { QueryRunner } from "typeorm";
import { DocumentService } from "../services/document.servcie";

export class DocumentHandler {
    @WebSocketAction("document:subscribe", { authenticate: true, schema: DocumentIdSchema })
    @UseQueryRunner()
    public async documentSubscribe(
        wsDetails: WebSocketDetails,
        message: H2CAppRequestMessage<"document:subscribe">,
        queryRunner: QueryRunner
    ) {
        const { documentId } = message.payload;

        const documentService = new DocumentService(wsDetails.requestMeta, queryRunner);
        await documentService.subscribeToDocument(wsDetails.socket, documentId, message.id);
    }

    @WebSocketAction("document:unsubscribe", { authenticate: true, schema: DocumentIdSchema })
    @UseQueryRunner()
    public async documentUnsubscribe(
        wsDetails: WebSocketDetails,
        message: H2CAppRequestMessage<"document:unsubscribe">,
        queryRunner: QueryRunner
    ) {
        const { documentId } = message.payload;

        const documentService = new DocumentService(wsDetails.requestMeta, queryRunner);
        await documentService.unsubscribeFromDocument(wsDetails.socket, documentId, message.id);
    }

    @WebSocketAction("document:update", { authenticate: true, schema: DocumentIdSchema })
    @UseQueryRunner()
    public async updateDocument(
        wsDetails: WebSocketDetails,
        message: H2CAppRequestMessage<"document:update">,
        data: Uint8Array,
        queryRunner: QueryRunner
    ) {
        const { documentId } = message.payload;

        const documentService = new DocumentService(wsDetails.requestMeta, queryRunner);

        await documentService.updateDocument(wsDetails.socket, documentId, data);

        // if async is used just confirm to the client with same message payload it has been handled
        return message.id ? message.payload : undefined;
    }

    @WebSocketAction("document:save", { authenticate: true, schema: DocumentIdSchema })
    @UseQueryRunner({ transactional: true })
    public async saveDocument(wsDetails: WebSocketDetails, message: H2CAppRequestMessage<"document:save">, queryRunner: QueryRunner) {
        const { documentId } = message.payload;

        const documentService = new DocumentService(wsDetails.requestMeta, queryRunner);

        await documentService.saveDocument(documentId, message.id);
    }
}
