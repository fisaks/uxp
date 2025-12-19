import { AppLogger, MqttService } from "@uxp/bff-common";
import { env } from "process";
import { subscriptionService } from "./subscription.service";

export const MASTER_STATUS_TOPIC = "uhn/master/status";
const mqttService = new MqttService({
    brokerUrl: env.UHN_MQTT_BROKER_URL ?? "",
    clientOptions: {
        clientId: `uhn-master`,
        clean: true,
        resubscribe: true,
        reconnectPeriod: 5000,
        connectTimeout: 30_000,
        will: {
            topic: MASTER_STATUS_TOPIC,
            payload: "offline",
            qos: 1,
            retain: true,
        }

    },
    onConnect: () => {
        AppLogger.info(undefined, { message: `[MQTT Service] Connected to broker at ${env.UHN_MQTT_BROKER_URL}` });
        subscriptionService.init();
        mqttService.publish(MASTER_STATUS_TOPIC, "online", { qos: 1, retain: true });
    },

});

for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, async () => {
        await mqttService.publishAsync(MASTER_STATUS_TOPIC, "offline", { qos: 1, retain: true });
        mqttService.disconnect();
        process.exit(0);
    });
}


export default mqttService;