
import { getWSPath } from "../../config";
import { addMessage, setCurrentRoom, userJoined, userLeft } from "./chatSlice";

let socket: WebSocket | null = null;

export const connectWebSocket = () => (dispatch: any) => {
    if (socket && socket.readyState !== WebSocket.CLOSED) {
        console.warn("WebSocket already connected, skipping new connection.");
        return; //Prevents duplicate connections
    }
    socket = new WebSocket(`${getWSPath()}`);

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data?.toString());
        console.log("WebSocket message:", message);
        switch (message.action) {
            case "new_message":
                dispatch(addMessage(message.payload));
                break;
            case "user_joined":
                dispatch(userJoined(message.payload));
                break;
            case "user_left":
                dispatch(userLeft(message.payload));
                break;
        }
    };
    socket.onerror = (error) => console.error("WebSocket error:", error);
    socket.onclose = () => console.log("WebSocket disconnected");
};

export const sendMessage = (room: string, text: string) => (_dispatch: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "send_message", payload: { room, text } }));
    }
};

export const joinRoom = (room: string) => (dispatch: any) => {
    console.log("Joining room:", room);
    if (socket?.readyState === WebSocket.OPEN) {
        dispatch(setCurrentRoom(room));
        socket.send(JSON.stringify({ action: "join_room", payload: { room } }));
    }
};

export const leaveRoom = (room: string) => (_dispatch: any) => {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: "leave_room", payload: { room } }));
    }
};
