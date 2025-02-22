import { DemoAppActionPayloadResponseMap } from "@demo/common";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type NewMessagePayload = DemoAppActionPayloadResponseMap["new_message"];
export type UserJoinedPayload = DemoAppActionPayloadResponseMap["user_joined"];
export type UserLeftPayload = DemoAppActionPayloadResponseMap["user_left"];

type ChatState = {
    rooms: string[]; // Available chat rooms
    messages: Record<string, NewMessagePayload[]>; // Messages per room
    users: Record<string, string[]>; // room -> userId[]
    currentRoom: string | null;
}

const initialState: ChatState = {
    rooms: ["general", "support", "random"], // Default rooms
    messages: {},
    users: {},
    currentRoom: null,
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        setCurrentRoom: (state, action: PayloadAction<string | null>) => {
            state.currentRoom = action.payload;
            return state;
        },
        addMessage: (state, action: PayloadAction<NewMessagePayload>) => {
            const { room } = action.payload;
            if (!state.messages[room]) {
                state.messages[room] = [];
            }
            state.messages[room] = [action.payload, ...state.messages[room]]
            return state;
        },
        updateUsers: (state, action: PayloadAction<{ room: string; users: string[] }>) => {
            state.users[action.payload.room] = action.payload.users;
            return state;
        },
        userJoined: (state, action: PayloadAction<UserJoinedPayload>) => {
            const { room, username } = action.payload;
            if (!state.users[room]) {
                state.users[room] = [];
            }
            if (!state.users[room].includes(username)) {
                state.users[room] = [username, ...state.users[room]];
            }
            return state;
        },
        userLeft: (state, action: PayloadAction<UserLeftPayload>) => {
            const { room, username } = action.payload;
            state.users[room] = state.users[room]?.filter(id => id !== username) || [];
            return state;
        },
    },
});

export const { setCurrentRoom, addMessage, updateUsers, userJoined, userLeft } = chatSlice.actions;
export default chatSlice.reducer;
