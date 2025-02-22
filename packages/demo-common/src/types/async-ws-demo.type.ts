

export type AsyncWSDemoActionPayloadRequestMap = {
    test_async_message: {
        waitTimeMs: number
        responseType: "success" | "error"

    }
}

export type AsyncWSDemoActionPayloadResponseMap = {
    test_async_message: {
        text: string
    }
}


export const AsyncWSMsgSchema = {

    type: 'object',
    properties: {
        waitTimeMs: { type: 'number', minimum: 0, maximum: 10000 },
        responseType: { type: 'string', enum: ["success", "error"] },
    },
    required: ['waitTimeMs', 'responseType']

}