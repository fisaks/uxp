import { DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap } from "@demo/common";
import { ServerWebSocketManager } from "@uxp/bff-common";



export class DemoAppServerWebSocketManager extends ServerWebSocketManager<DemoAppActionPayloadRequestMap, DemoAppActionPayloadResponseMap> {
    private static instance: DemoAppServerWebSocketManager | null = null;

    private constructor() {
        super()
    }

    static getInstance(): DemoAppServerWebSocketManager {
        return this.instance ?? (this.instance = new DemoAppServerWebSocketManager());
    }
}