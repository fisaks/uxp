// rule-state-reader.ts
import { ResourceBase, ResourceType, StateReader, StateValueByResourceType } from "@uhn/blueprint";
import { assertNever } from "@uxp/common";
import { ResourceMissingIdError, ResourceStateNotAvailableError, ResourceStateTypeMismatchError } from "@uhn/common";
import { RuntimeStateService } from "../services/runtime-state.service";
import { isAnalogValue, isDigitalValue, isTimerValue } from "../utils/runtime-state.util";


export function createRuleStateReader({ stateService }: { stateService: RuntimeStateService }): StateReader {
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
                case "virtualDigitalInput":
                    if (!isDigitalValue(s.value)) {
                        throw new ResourceStateTypeMismatchError(r.id, r.type, s.value);
                    }
                    return s.value as StateValueByResourceType<T>;
                case "analogInput":
                case "analogOutput":
                    if (!isAnalogValue(s.value)) {
                        throw new ResourceStateTypeMismatchError(r.id, r.type, s.value);
                    }
                    return s.value as StateValueByResourceType<T>;
                case "timer":
                    if (!isTimerValue(s.value)) {
                        throw new ResourceStateTypeMismatchError(r.id, r.type, s.value);
                    }
                    return s.value as StateValueByResourceType<T>;
                case "complex":
                    if (!isDigitalValue(s.value) && !isAnalogValue(s.value)) {
                        throw new ResourceStateTypeMismatchError(r.id, r.type, s.value);
                    }
                    return s.value as StateValueByResourceType<T>;
                default:
                    assertNever(r.type, `Unsupported resource type "${r.type}" for getState`);
            }
        },
    }
}
