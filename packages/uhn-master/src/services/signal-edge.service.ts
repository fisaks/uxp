import { ResourceStateValue, RuntimeResourceBase } from "@uhn/common";
import mqttService from "./mqtt.service";


export type SignalState = {
    value: ResourceStateValue;
    timestamp: number;
}
export type SignalStatePayload = {
    resourceId: string;
    value: ResourceStateValue;
    timestamp: number;
}

export function isSignalStatePayload(payload: unknown): payload is SignalStatePayload {
    if (payload && typeof payload === "object") {
        return "resourceId" in payload && "value" in payload && "timestamp" in payload;
    }
    return false;
}

export class SignalEdgeService {

    sendStateSignalToEdge(
        resource: Pick<RuntimeResourceBase<"digitalInput">, "edge" | "id">,
        state: SignalState) {


        mqttService.publish(
            this.signalStateTopic(resource.edge, resource.id),
            { ...state, resourceId: resource.id } satisfies SignalStatePayload,
            { retain: true, qos: 1 }
        );

    }

    clearStateSignalOnEdge(
        resource: Pick<RuntimeResourceBase<"digitalInput">, "edge" | "id">) {

        mqttService.publish(
            this.signalStateTopic(resource.edge, resource.id),
            null,
            { retain: true, qos: 1 }
        );

    }

    private signalStateTopic(edge: string, resourceId: string) {
        return `uhn/${edge}/signal/state/${resourceId}`;
    }
}
