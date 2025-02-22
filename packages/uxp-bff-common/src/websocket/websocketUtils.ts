import { WebSocket } from "ws";
import { AppLogger, RequestMetaData } from "../utils/AppLogger";

export const sendWebSocketMessage = ({
    socket, message, requestMetaData, onClosed, onFailure
}: {
    socket: WebSocket;
    message: string | Buffer | ArrayBufferLike;

    requestMetaData?: RequestMetaData
    onClosed?: (socket: WebSocket) => void;
    onFailure?: (socket: WebSocket, error?: unknown) => void;
}) => {
    try {

        if (socket.readyState !== WebSocket.OPEN) {
            AppLogger.warn(requestMetaData, { message: `Socket is not open (state: ${socket.readyState}). Skipping message.` });

            if (socket.readyState === WebSocket.CLOSED) {
                onClosed?.(socket);
            }
            onFailure?.(socket);
            return false; // Failure

        }
        socket.send(message);
        return true;


    } catch (err) {
        AppLogger.error(requestMetaData, { message: "Error sending WebSocket message", error: err });
        onFailure?.(socket, err);
        return false; // Failure
    }
    

};
