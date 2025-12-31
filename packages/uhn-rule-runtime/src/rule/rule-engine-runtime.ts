// rule-engine-runtime.ts
import { ResourceBase, ResourceType, RuntimeReader, StateValueByResourceType } from "@uhn/blueprint";
import { assertNever } from "@uxp/common";
import { ResourceMissingIdError, ResourceStateNotAvailableError, ResourceStateTypeMismatchError } from "@uhn/common";
import { RuntimeStateService } from "../services/runtime-state.service";
import { isDigitalValue, isTimerValue } from "../utils/runtime-state.util";


export function createRuleRuntime({ stateService }: { stateService: RuntimeStateService }): RuntimeReader {
    return {
        getState: <T extends ResourceType>(r: ResourceBase<T>) => {
            if (!r.id) throw new ResourceMissingIdError(r.type);
            const s = stateService.get(r.id);
            if (!s || s.value === undefined) {
                throw new ResourceStateNotAvailableError(r.id,
                    r.type,
                    `State not available for resource "${r.id}" of type "${r.type}"`);
            }
            switch (r.type) {
                case "digitalInput":
                case "digitalOutput":
                    if (!isDigitalValue(s.value)) {
                        throw new ResourceStateTypeMismatchError(r.id, r.type, s.value);
                    }
                    return s.value as StateValueByResourceType<T>;
                case "timer":
                    if (!isTimerValue(s.value)) {
                        throw new ResourceStateTypeMismatchError(r.id, r.type, s.value);
                    }
                    return s.value as StateValueByResourceType<T>;
                default:
                    assertNever(r.type, `Unsupported resource type "${r.type}" for getState`);
            }
        },
    }
}