

export type BinaryDemoActionPayloadRequestMap = {
    get_binary_message: {
        message?: string
        responseType: "success" | "error"
    }
}

export type BinaryDemoActionPayloadResponseMap = {
    binary_response: {
        message?: string
    }
}


export const BinaryDemoSchema = {

    type: 'object',
    properties: {
        message: { type: 'string', maxLength: 500 },
    },


}