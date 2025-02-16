import { WebSocketProvider } from "@uxp/ui-lib";


import { useMemo } from "react";
import { DemoMessageListener, DemoWebSocketManager } from "./app/DemoWebSocketManager";
import { addMessage, userJoined, userLeft } from "./features/chat/chatSlice";
import { useAppDispatch } from "./hooks";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {
    const dispatch = useAppDispatch();

    const ws = useMemo(() => DemoWebSocketManager.getInstance(), [])

    const demoListeners: DemoMessageListener = useMemo(() => ({
        new_message: (message) => { dispatch(addMessage(message.payload!)) },
        user_joined: (message) => { dispatch(userJoined(message.payload!)) },
        user_left: (message) => { dispatch(userLeft(message.payload!)) }
    } as DemoMessageListener), [dispatch]);

    return <WebSocketProvider wsInstance={ws} listeners={demoListeners}>
        {children}
    </WebSocketProvider>
}