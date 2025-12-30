import { RuleRuntimeCommand } from "@uhn/common";

import { handleError, handleUnknownCommand } from "../io/handle-error";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";
import { handleListResources } from "./resource-list.handler";
import { handleStateFullUpdate } from "./state-full-update.handler";
import { handleStateUpdate } from "./state-update.handler";

export function createCommandRouter(deps: RuleRuntimeDependencies) {
    return {
        async handle(cmd: RuleRuntimeCommand) {
            try {
                switch (cmd.cmd) {
                    case "listResources":
                        await handleListResources(deps, cmd);
                        break;
                    case "stateUpdate":
                        await handleStateUpdate(deps, cmd);
                        break;
                    case "stateFullUpdate":
                        await handleStateFullUpdate(deps, cmd);
                        break;
                    default:
                        handleUnknownCommand(cmd);
                }
            } catch (err: unknown) {
                handleError(cmd, err);
            }
        }
    };
}
