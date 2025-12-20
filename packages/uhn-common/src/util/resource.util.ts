import { ResourceType } from "@uhn/blueprint";
import { RuntimeResourceBase } from "../types/worker.type";


export function makeAddressKey(resource: Pick<RuntimeResourceBase<ResourceType>, "edge" | "device" | "type" | "pin">): string | undefined {
    if (resource.edge && resource.device && resource.type && resource.pin !== undefined) {
        return `${resource.edge}:${resource.device}:${resource.type}:${resource.pin}`;
    }
    if (resource.edge && resource.device && resource.type) {
        return `${resource.edge}:${resource.device}:${resource.type}`;
    }
    if (resource.edge && resource.device) {
        return `${resource.edge}:${resource.device}`;
    }
    return undefined;
}
