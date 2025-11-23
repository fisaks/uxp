import mqttService from "./mqtt.service";

export class EdgeCommandService {
    private static instance: EdgeCommandService | null = null;

    private constructor() {}

    static getInstance() {
        return this.instance ?? (this.instance = new EdgeCommandService());
    }

    sendEdgeCommand(edge: string, cmd: unknown) {
        const topic = `uhn/${edge}/cmd`;
        mqttService.publish(topic, cmd);
    }
}
