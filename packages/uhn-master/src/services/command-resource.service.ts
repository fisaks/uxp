import { RuntimeDigitalInputResource, RuntimeDigitalOutputResource, RuntimeResource, UhnResourceCommand } from "@uhn/common";
import { AppErrorV2 } from "@uxp/bff-common";
import { blueprintResourceService } from "./blueprint-resource.service";
import { commandEdgeService } from "./command-edge.service";
import { stateRuntimeService } from "./state-runtime.service";
import { stateSignalService } from "./state-signal.service";
import { timerEdgeService } from "./timer-edge.service";

export class CommandsResourceService {


    async executeResourceCommand(resourceId: string, command: UhnResourceCommand): Promise<void> {
        const resource = blueprintResourceService.getResourceById(resourceId);
        if (!resource) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Resource with id ${resourceId} not found` });
        }
        this.validateResourceAddressability(resource);
        this.validateCommandForResource(resource, command);
        
        
        if (resource.type === "timer") {
            timerEdgeService.sendTimerCommandToEdge({ id: resource.id, edge: resource.edge }, { action: "clear" });
        } else if (resource.type === "digitalOutput") {
            commandEdgeService.sendCommandToEdge(resource as RuntimeDigitalOutputResource, command);
        } else if (resource.type === "digitalInput" && command.type === "toggle") {
            const currentState = stateRuntimeService.getResourceState(resourceId);
            const currentValue = currentState?.value;
            const nextValue = (typeof currentValue === "boolean") ? !currentValue : true;
            stateSignalService.setSignalState(resource, nextValue);
        } else if (resource.type === "digitalInput" && (command.type === "press" || command.type === "release")) {
            const signalValue = command.type === "press" ? true : false;
            stateSignalService.setSignalState(resource, signalValue);
        }
    }

    private validateResourceAddressability(resource: RuntimeResource) {
        if (resource.type === "timer") {
            if (!resource.edge) {
                throw new AppErrorV2({ statusCode: 400, code: "RESOURCE_NOT_ADDRESSABLE", message: `Timer resource ${resource.id} has no edge` });
            }
            return;
        }

        if (!resource.edge || !resource.device || resource.pin == null) {
            throw new AppErrorV2({ statusCode: 400, code: "RESOURCE_NOT_ADDRESSABLE", message: `Resource ${resource.id} is not addressable` });
        }
    }

    private validateCommandForResource(resource: RuntimeResource, command: UhnResourceCommand) {
        if (resource.type === "timer") {
            if (command.type !== "clearTimer") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for timer resource` });
            }
            return;
        }

        if (resource.type === "digitalOutput") {
            if (command.type !== "toggle" && command.type !== "set") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for digitalOutput resource` });
            }
            return;
        }

        if (resource.type === "digitalInput") {
            const inputResource = resource as RuntimeDigitalInputResource;

            if (inputResource.inputType === "push" && command.type !== "press" && command.type !== "release") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for digitalInput push resource` });
            }
            if (inputResource.inputType === "toggle" && command.type !== "toggle") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for digitalInput toggle resource` });
            }
            return;
        }

        throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_TYPE", message: `Resource type ${resource.type} does not support commands` });
    }
}

