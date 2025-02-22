
export type ChatDemoActionPayloadRequestMap = {
    send_message: {
        room: string
        text: string
    }
    join_room: {
        room: string
    }
    leave_room: {
        room: string
    }
}

export type ChatDemoActionPayloadResponseMap = {
    new_message: {
        room: string
        username: string
        text: string
        timestamp: string
    }
    user_joined: {
        room: string
        username: string
    }
    user_left: {
        room: string
        username: string
    }
}


export const ChatSendMessageSchema = {

    type: 'object',
    properties: {
        room: { type: 'string', maxLength: 25 },
        text: {
            type: 'string',
            maxLength: 500,
            pattern: '^[a-zA-Z0-9 .,?!]*$' // Only normal Latin characters, spaces, and common punctuation
        },
    },
    required: ['room', 'text']

}

export const ChatJoinRoomchema = {

    type: 'object',
    properties: {
        room: { type: 'string', maxLength: 25 },
    },
    required: ['room']

}
export const ChatLeaveRoomchema = ChatJoinRoomchema;