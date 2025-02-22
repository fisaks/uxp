

export type BinaryDemoActionPayloadRequestMap = {
    get_binary_message: {
        message?: string
        responseType: "success" | "error"
    }
    upload_binary_message: {
        mimeTYpe: string
        fileName: string
    }

}

export type BinaryDemoActionPayloadResponseMap = {
    binary_response: {
        message?: string
    }
    upload_response: {
        mimeTYpe: string
        fileName: string
    }

}


export const BinaryDemoSchema = {

    type: 'object',
    properties: {
        message: { type: 'string', maxLength: 500 },
    },


}