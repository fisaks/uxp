
import { initBlueprintResourceDispatcher } from "./blueprint-resource.dispatcher";
import { initRuleActionDispatcher } from "./rule-action.dispatcher";
import { initStateRuntimeDispatcher } from "./state-runtime.dispatcher";
import { initTopicTraceDispatcher } from "./topic-trace.dispatcher";


export const setupWebDispatchers = () => {

    // Initialize dispatchers
    initTopicTraceDispatcher();
    initBlueprintResourceDispatcher();
    initStateRuntimeDispatcher();
    initRuleActionDispatcher();
};