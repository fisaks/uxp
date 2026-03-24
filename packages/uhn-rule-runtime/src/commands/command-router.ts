import { RuleRuntimeCommand } from "@uhn/common";

import { handleError, handleUnknownCommand } from "../io/handle-error";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";
import { handleActionEvent } from "./action-input.handler";
import { handleLongPressCommand } from "./longpress-command.handler";
import { handleMuteCommand } from "./mute-command.handler";
import { handleStateFullUpdate } from "./state-full-update.handler";
import { handleStateUpdate } from "./state-update.handler";
import { handleTapCommand } from "./tap-command.handler";
import { handleTimerCommand } from "./timer-command.handler";

export function createCommandRouter(deps: RuleRuntimeDependencies) {
    return {
        async handle(cmd: RuleRuntimeCommand) {
            try {
                switch (cmd.cmd) {
                    case "stateUpdate":
                        await handleStateUpdate(deps, cmd);
                        break;
                    case "stateFullUpdate":
                        await handleStateFullUpdate(deps, cmd);
                        break;
                    case "timerCommand":
                        handleTimerCommand(deps, cmd);
                        break;
                    case "muteCommand":
                        handleMuteCommand(deps, cmd);
                        break;
                    case "tapCommand":
                        handleTapCommand(deps, cmd);
                        break;
                    case "longPressCommand":
                        handleLongPressCommand(deps, cmd);
                        break;
                    case "actionEvent":
                        handleActionEvent(deps, cmd);
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
