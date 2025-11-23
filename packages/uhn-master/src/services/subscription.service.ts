import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";
import { CatalogService } from "./catalog.service";
import { DeviceStateService } from "./device-state.service";
import mqttService from "./mqtt.service";

export class SubscriptionService {
    private static instance: SubscriptionService | null = null;

    private constructor() { }

    static getInstance() {
        return this.instance ?? (this.instance = new SubscriptionService());
    }

    init() {

        mqttService.subscribe("uhn/+/device/+/state", (topic, payload) =>
            DeviceStateService.getInstance().handleDeviceState(topic, payload)
        );

        mqttService.subscribe("uhn/+/catalog", (topic, payload) =>
            CatalogService.getInstance().handleCatalog(topic, payload)
        );

        mqttService.subscribe("uhn/+/cmd", (topic, payload) =>
            UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
                payload: { topic, message: payload }
            })
        );

        mqttService.subscribe("uhn/+/device/+/cmd", (topic, payload) =>
            UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
                payload: { topic, message: payload }
            })
        );
    }
}
