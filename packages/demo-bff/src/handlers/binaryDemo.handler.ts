import { BinaryDemoSchema, DemoAppRequestMessage } from "@demo/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";


import { BinaryService } from "../services/binary.service";
import { DemoAppServerWebSocketManager } from "../ws/DemoAppServerWebSocketManager";


export class BinaryDemoHandler {
    private wsManager = DemoAppServerWebSocketManager.getInstance();

    @WebSocketAction("get_binary_message", { authenticate: true, schema: BinaryDemoSchema })
    public async getBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"get_binary_message">) {

        const binaryService = new BinaryService();
        const { header, data } = binaryService.createBinaryMessage(wsDetails, mes);

        this.wsManager.sendBinaryData(wsDetails.socket, header, data, wsDetails.requestMeta);

    }

    @WebSocketAction("upload_binary_message", { authenticate: true, schema: BinaryDemoSchema })
    public async uploadBinaryMessage(wsDetails: WebSocketDetails, mes: DemoAppRequestMessage<"upload_binary_message">, data: Uint8Array) {

        const binaryService = new BinaryService();

        const { header, data: responseData } = binaryService.uploadBinaryMessage(wsDetails, mes, data);

        this.wsManager.sendBinaryData(wsDetails.socket, header, responseData, wsDetails.requestMeta);

    }

}
