import { H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap, H2CAppResponseMessage } from "@h2c/common";
import { RequestMetaData, ServerWebSocketManager } from "@uxp/bff-common";
import { WebSocket } from "ws";

type BroadcastDocumentUpdate = {
    updater: WebSocket,
    documentId: string,
    update: Uint8Array,
    requestMeta: RequestMetaData
}

type BroadcastDocumentAwareness = {
    sender: WebSocket,
    documentId: string,
    update: Uint8Array,
    requestMeta: RequestMetaData
}
type BroadcastDocumentSave = {

    documentId: string,
    id: string | undefined
    requestMeta: RequestMetaData
}

export class H2CAppServerWebSocketManager extends ServerWebSocketManager<H2CAppActionPayloadRequestMap, H2CAppActionPayloadResponseMap> {
    private static instance: H2CAppServerWebSocketManager | null = null;

    private constructor() {
        super()
    }

    static getInstance(): H2CAppServerWebSocketManager {
        return this.instance ?? (this.instance = new H2CAppServerWebSocketManager());
    }

    public subscribeToDocument(socket: WebSocket, documentId: string) {
        this.joinTopic(socket, `document:${documentId}`);
    }
    public unsubscribeFromDocument(socket: WebSocket, documentId: string) {
        this.leaveTopic(socket, `document:${documentId}`);
    }
    public broadcastDocumentUpdate({ updater, documentId, update, requestMeta }: BroadcastDocumentUpdate) {
        const header: H2CAppResponseMessage<"document:updated"> = {
            action: "document:updated",
            success: true,
            payload: {
                documentId,
            },

        }

        this.broadcastBinaryDataToTopic(`document:${documentId}`, header, update, requestMeta, updater);
    }
    public broadcastDocumentSave({ documentId, requestMeta, id }: BroadcastDocumentSave) {
        const header: H2CAppResponseMessage<"document:saved"> = {
            action: "document:saved",
            id: id,
            success: true,
            payload: {
                documentId,
            },

        }

        this.broadcastToTopic(`document:${documentId}`, header, requestMeta);
    }

    public broadcastDocumentAwareness({ sender, documentId, update, requestMeta }: BroadcastDocumentAwareness) {
        const header: H2CAppResponseMessage<"document:awareness"> = {
            action: "document:awareness",
            success: true,
            payload: {
                documentId,
            },

        }
        this.broadcastBinaryDataToTopic(`document:${documentId}`, header, update, requestMeta, sender);
    }

}