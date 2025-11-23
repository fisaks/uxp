import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class DeviceStateService {
    private static instance: DeviceStateService | null = null;

    private deviceStates = new Map<string, unknown>(); // key = topic or deviceId

    private constructor() { }

    static getInstance() {
        return this.instance ?? (this.instance = new DeviceStateService());
    }

    handleDeviceState(topic: string, payload: unknown) {
        this.deviceStates.set(topic, payload);

        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    }

    getStateForTopic(topic: string) {
        return this.deviceStates.get(topic);
    }
}
