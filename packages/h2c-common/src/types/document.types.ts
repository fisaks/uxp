import { WebSocketMessage } from "@uxp/common";

export type DocumentType = "house-details" | "building-details"

type ClientDocumentActions = "document:subscribe" | "document:save"
type ClientDocumentBinaryActions = "document:update" | "document:full"


export type DocumentSubscribePayload = {
    "documentId": string;
}
export type DocumentUpdatePayload = {
    "documentId": string;
    "update": Uint8Array
}

export type DocumentSavePayload = {
    "documentId": string;
}

export type ClientDocumentPayloads = {
    "document:subscribe": DocumentSubscribePayload;
    "document:update": DocumentUpdatePayload;
    "document:save": DocumentSavePayload;
};

export type BinaryHeader = {
    action: ClientDocumentBinaryActions
    documentId: string
}
//type ServerDocumentActions="document:subscribe"



export type ClientChatActionPayloadMap = {
    [A in ClientDocumentActions]: ClientDocumentPayloads[A];
};

export type DocumentMessage<Action extends keyof ClientChatActionPayloadMap> = WebSocketMessage<Action, ClientChatActionPayloadMap>;