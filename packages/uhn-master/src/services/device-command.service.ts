import mqttService from "./mqtt.service";


export class DeviceCommandService {
    private static instance: DeviceCommandService | null = null;

    private constructor() {}

    static getInstance() {
        return this.instance ?? (this.instance = new DeviceCommandService());
    }

    sendDeviceCommand(edge: string, device: string, cmd: unknown) {
        const topic = `uhn/${edge}/device/${device}/cmd`;
        mqttService.publish(topic, cmd);
    }
}
