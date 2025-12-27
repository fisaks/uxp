
import { BlueprintResourceDispatcher } from "./blueprint-resource.dispatcher";
import { StateRuntimeDispatcher } from "./state-runtime.dispatcher";
import { TopicTraceDispatcher } from "./topic-trace.dispatcher";


export const setupWebDispatchers = () => {

    // Initialize dispatchers
    new TopicTraceDispatcher();
    new BlueprintResourceDispatcher();
    new StateRuntimeDispatcher();
};