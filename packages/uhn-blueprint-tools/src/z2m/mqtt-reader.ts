import mqtt from "mqtt";
import type { Z2MDevice } from "./types";

/**
 * Connects to MQTT, reads the retained bridge/devices message, and disconnects.
 */
export async function readBridgeDevices(mqttUrl: string, baseTopic: string): Promise<Z2MDevice[]> {
    return new Promise((resolve, reject) => {
        const client = mqtt.connect(mqttUrl, {
            clientId: `z2m-import-${Date.now()}`,
            clean: true,
        });

        const timeout = setTimeout(() => {
            client.end(true);
            reject(new Error(`Timeout waiting for ${baseTopic}/bridge/devices (10s). Is Z2M running?`));
        }, 10000);

        client.on("connect", () => {
            client.subscribe(`${baseTopic}/bridge/devices`, { qos: 0 });
        });

        client.on("message", (_topic, payload) => {
            clearTimeout(timeout);
            try {
                const devices = JSON.parse(payload.toString()) as Z2MDevice[];
                client.end();
                resolve(devices.filter(d => d.type !== "Coordinator"));
            } catch (err) {
                client.end();
                reject(new Error(`Failed to parse bridge/devices: ${err}`));
            }
        });

        client.on("error", (err) => {
            clearTimeout(timeout);
            client.end(true);
            reject(err);
        });
    });
}
