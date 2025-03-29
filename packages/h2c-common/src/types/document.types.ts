import { MessagePayloadSchema } from "@uxp/common"

export type DocumentType = "house-details" | "building-details"

export type DocumentIdPayload = {
    documentId: string
}
export type DocumentFullPayload = {
    documentId: string
    type: DocumentType,
}
export type DocumentActionPayloadRequestMap = {
    "document:subscribe": DocumentIdPayload

    "document:update": DocumentIdPayload
    "document:save": DocumentIdPayload
    "document:delete": DocumentIdPayload
    "document:full": DocumentIdPayload
    "document:unsubscribe": DocumentIdPayload
    "document:awareness": DocumentIdPayload
}

export type DocumentActionPayloadResponseMap = {
    "document:full": DocumentFullPayload
    "document:updated": DocumentIdPayload
    "document:saved": DocumentIdPayload
    "document:unsubscribed": DocumentIdPayload
    "document:awareness": DocumentIdPayload
}

export const DocumentIdSchema: MessagePayloadSchema<DocumentIdPayload> = {

    type: 'object',
    properties: {
        documentId: { type: 'string', minLength: 21, maxLength: 21 },
    },
    required: ['documentId']
}