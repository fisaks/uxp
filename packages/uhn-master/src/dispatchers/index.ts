import { BlueprintResourceDispatcher } from "./blueprint-resource-dispatcher";
import { BlueprintRuntimeStateDispatcher } from "./blueprint-runtime-state-dispatcher";
import { TopicTraceDispatcher } from "./topic-trace.dispatcher";


export const setupWebDispatchers = () => {

    // Initialize dispatchers
    new TopicTraceDispatcher();
    new BlueprintResourceDispatcher();
    new BlueprintRuntimeStateDispatcher();
};