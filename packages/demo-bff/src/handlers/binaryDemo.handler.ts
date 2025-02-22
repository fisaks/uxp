import { BinaryDemoSchema, DemoAppRequestMessage, DemoAppResponseMessage } from "@demo/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import fs from "fs";
import path from "path";


import { DemoAppServerWebSocketManager } from "../ws/DemoAppServerWebSocketManager";


export class BinaryDemoHandler {
    private wsManager = DemoAppServerWebSocketManager.getInstance();

    @WebSocketAction("get_binary_message", { authenticate: true, schema: BinaryDemoSchema })
    public async handleBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"get_binary_message">) {

        const { message, responseType } = mes.payload
        const { id } = mes

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
            id: id,
            ...(message ? { payload: { message: message } } : {})
        }

        this.wsManager.sendBinaryData(wsDetails.socket, header, buf, wsDetails.requestMeta);

    }



    // Generate a 64x64 pixel JPEG with a smiley face 🙂

}
