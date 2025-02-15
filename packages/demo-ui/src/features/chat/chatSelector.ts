import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../../app/store";

const selectChatState = (state: RootState) => state.chat;

export const selectCurrentRoom = () => createSelector([selectChatState], (chatState) => chatState.currentRoom);
export const selectChatRooms = () => createSelector([selectChatState], (chatState) => chatState.rooms);
export const selectRoomMessages = () => createSelector([selectChatState], (chatState) => {
    const currentRoom=chatState.currentRoom
    if (currentRoom) {
        return chatState.messages[currentRoom] ?? [];
    }
    return [];
})


export const selectRoomUsers = () => createSelector([selectChatState], (chatState) => {

    const currentRoom=chatState.currentRoom
        if (currentRoom) {
            return chatState.users[currentRoom] ?? [];
        }
        return [];
});
