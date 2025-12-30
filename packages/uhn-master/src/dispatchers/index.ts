
import { initBlueprintResourceDispatcher } from "./blueprint-resource.dispatcher";
import { initStateRuntimeDispatcher } from "./state-runtime.dispatcher";
import { initTopicTraceDispatcher } from "./topic-trace.dispatcher";


export const setupWebDispatchers = () => {

    // Initialize dispatchers
    initTopicTraceDispatcher();
    initBlueprintResourceDispatcher();
    initStateRuntimeDispatcher();
};