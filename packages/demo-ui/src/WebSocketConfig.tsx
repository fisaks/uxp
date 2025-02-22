import { WebSocketProvider } from "@uxp/ui-lib";


import { DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap } from "@demo/common";
import { useCallback, useMemo } from "react";
import { DemoAppBrowserWebSocketManager, DemoAppErrorHandler, DemoAppWebSocketResponseListener } from "./app/DemoAppBrowserWebSocketManager";
import { addMessage, userJoined, userLeft } from "./features/chat/chatSlice";
import { useAppDispatch } from "./hooks";



type WebSocketConfigProps = {
    children: React.ReactNode;

};

export const WebSocketConfig: React.FC<WebSocketConfigProps> = ({ children }) => {
    const dispatch = useAppDispatch();

    const ws = useMemo(() => DemoAppBrowserWebSocketManager.getInstance(), [])

    const demoListeners: DemoAppWebSocketResponseListener = useMemo(() => ({
        new_message: (message) => { dispatch(addMessage(message.payload!)) },
        user_joined: (message) => { dispatch(userJoined(message.payload!)) },
        user_left: (message) => { dispatch(userLeft(message.payload!)) },
        
        //binary_response: (message, data) => { console.log("Binary response", message.payload, data) }
    } as DemoAppWebSocketResponseListener), [dispatch]);

    const globalErrorHandler: DemoAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error(`Error in WebSocket action ${action}`, error, errorDetails);
    }) as DemoAppErrorHandler, [])

    return <WebSocketProvider<DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap>
        wsInstance={ws} listeners={demoListeners} onError={globalErrorHandler}>
        {children}
    </WebSocketProvider>
}