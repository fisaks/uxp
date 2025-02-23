import { DemoAppRequestMessage, DemoAppResponseMessage } from "@demo/common";
import { AppError, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import fs from "fs";
import path from "path";
import { DemoAppServerWebSocketManager } from "../ws/DemoAppServerWebSocketManager";

export class BinaryService {
   


    public createBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"get_binary_message">) {

        const { message, responseType } = mes.payload


        if (responseType === "error") {
            throw new AppError("NOT_FOUND", "The file was not found");

        }
        const filePath = path.resolve(__dirname, "small-image.jpg");
        const data = fs.readFileSync(filePath)

        AppLogger.info(wsDetails.requestMeta, { message: "Sending binary response" + data.length });
        const header: DemoAppResponseMessage<"binary_response"> = {
            action: "binary_response",
            success: true,
            ...(message ? { payload: { message: message } } : {})
        }
        return {
            header,
            data
        }

    }

    public uploadBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"upload_binary_message">, data: Uint8Array) {

        const { fileName, mimeTYpe } = mes.payload

        AppLogger.info(wsDetails.requestMeta, { message: "pingin binary response back size:" + data.length });
        const header: DemoAppResponseMessage<"upload_response"> = {
            action: "upload_response",
            success: true,
            payload: { fileName, mimeTYpe }

        }
        return {
            header,
            data
        }

    }
}