import { ResourceType } from "@uhn/blueprint";
import { RuntimeDigitalInputResourceBase, RuntimeResourceBase, UhnResourceCommand } from "@uhn/common";
import { AppErrorV2 } from "@uxp/bff-common";
import { blueprintResourceService } from "./blueprint-resource.service";
import { commandEdgeService } from "./command-edge.service";
import { stateRuntimeService } from "./state-runtime.service";
import { stateSignalService } from "./state-signal.service";

export class CommandsResourceService {


    async executeResourceCommand(resourceId: string, command: UhnResourceCommand): Promise<void> {
        const resource = blueprintResourceService.findResourceById(resourceId);
        if (!resource) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Resource with id ${resourceId} not found` });
        }
        this.validateResourceAddressability(resource);
        this.validateCommandForResource(resource, command);

        if (resource.type === "digitalOutput") {
            commandEdgeService.sendCommandToEdge(resource as RuntimeResourceBase<"digitalOutput">, command);
        } else if (resource.type === "digitalInput" && command.type === "toggle") {
            const currentState = stateRuntimeService.getResourceState(resourceId);
            const currentValue = currentState?.value;
            const nextValue = (typeof currentValue === "boolean") ? !currentValue : true;
            stateSignalService.setSignalState(resourceId, nextValue);
        } else if (resource.type === "digitalInput" && (command.type === "press" || command.type === "release")) {
            const signalValue = command.type === "press" ? true : false;
            stateSignalService.setSignalState(resourceId, signalValue);
        }
    }

    private validateResourceAddressability(resource: RuntimeResourceBase<ResourceType>) {
        if (!resource.edge || !resource.device || resource.pin == null) {
            throw new AppErrorV2({ statusCode: 400, code: "RESOURCE_NOT_ADDRESSABLE", message: `Resource ${resource.id} is not addressable` });
        }
    }

    private validateCommandForResource(resource: RuntimeResourceBase<ResourceType>, command: UhnResourceCommand) {
        if (resource.type === "digitalOutput") {
            if (command.type !== "toggle" && command.type !== "set") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for digitalOutput resource` });
            }
            return;
        }

        if (resource.type === "digitalInput") {
            const inputResource = resource as RuntimeDigitalInputResourceBase;

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

