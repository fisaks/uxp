import { runtimeOutput } from "../io/runtime-output";
import { RuleTriggerEvent } from "./rule-engine.type";

type Listener = (event: RuleTriggerEvent) => void;

export class TriggerEventBus {
    private readonly listeners = new Set<Listener>();

    on(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit(event: RuleTriggerEvent) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (error) {
                runtimeOutput.log({
                    level: "error",
                    component: "TriggerEventBus",
                    message: "Listener threw while handling trigger event",
                    data: {
                        error: String(error),
                        event,
                    }

                });
            }
        }
    }
}
