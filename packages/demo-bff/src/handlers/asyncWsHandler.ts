import { AsyncWSMsgSchema, DemoAppRequestMessage, DemoAppResponseMessage } from "@demo/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";

export class AsyncWsHandler {

    @WebSocketAction("test_async_message", { authenticate: true , schema: AsyncWSMsgSchema})
    public async handleAsynMessage(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"test_async_message">) {

        const { waitTimeMs, responseType } = message.payload

        setTimeout(() => {
            const result: DemoAppResponseMessage<"test_async_message"> = {
                success: responseType === "success",
                action: "test_async_message",
                id: message.id,
                payload: responseType === "success" ? { text: `OK after ${waitTimeMs}` } : undefined,
                error: responseType === "error" ? { code: ErrorCodes.INTERNAL_SERVER_ERROR, message: "Async ws message that was suppose to result in error" } : undefined
            }
            wsDetails.socket.send(JSON.stringify(result));
        }, waitTimeMs);

    }

}
