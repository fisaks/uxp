import { BinaryDemoSchema, DemoAppRequestMessage, DemoAppResponseMessage } from "@demo/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import fs from "fs";
import path from "path";


import { DemoAppServerWebSocketManager } from "../ws/DemoAppServerWebSocketManager";


export class BinaryDemoHandler {
    private wsManager = DemoAppServerWebSocketManager.getInstance();

    @WebSocketAction("get_binary_message", { authenticate: true, schema: BinaryDemoSchema })
    public async getBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"get_binary_message">) {

        const { message, responseType } = mes.payload


        if (responseType === "error") {
            this.wsManager.sendMessage(wsDetails.socket, {
                action: "binary_response",
                success: false,
                error: { code: "NOT_FOUND", message: "The file was not found" },

            });
            return;
        }
        const filePath = path.resolve(__dirname, "small-image.jpg");
        const buf = fs.readFileSync(filePath)

        AppLogger.info(wsDetails.requestMeta, { message: "Sending binary response" + buf.length });
        const header: DemoAppResponseMessage<"binary_response"> = {
            action: "binary_response",
            success: true,
            ...(message ? { payload: { message: message } } : {})
        }

        this.wsManager.sendBinaryData(wsDetails.socket, header, buf, wsDetails.requestMeta);

    }

    @WebSocketAction("upload_binary_message", { authenticate: true, schema: BinaryDemoSchema })
    public async uploadBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"upload_binary_message">, data: Uint8Array) {

        const { fileName, mimeTYpe } = mes.payload

        AppLogger.info(wsDetails.requestMeta, { message: "pingin binary response back size:" + data.length });
        const header: DemoAppResponseMessage<"upload_response"> = {
            action: "upload_response",
            success: true,
            payload: { fileName, mimeTYpe }

        }

        this.wsManager.sendBinaryData(wsDetails.socket, header, data, wsDetails.requestMeta);

    }

}
