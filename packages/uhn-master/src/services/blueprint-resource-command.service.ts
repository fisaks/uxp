import { ResourceType } from "@uhn/blueprint";
import { RuntimeResourceBase, UhnResourceCommand } from "@uhn/common";
import { AppErrorV2 } from "@uxp/bff-common";
import { blueprintResourceService } from "./blueprint-resource.service";
import { deviceCommandService } from "./device-command.service";

export class BlueprintResourceCommandService {


    async executeResourceCommand(resourceId: string, command: UhnResourceCommand): Promise<void> {
        const resource = blueprintResourceService.findResourceById(resourceId);
        if (!resource) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Resource with id ${resourceId} not found` });
        }
        this.validate(resource, command);

        deviceCommandService.sendResourceCommandToDevice(resource as RuntimeResourceBase<"digitalOutput">, command);

    }

    private validate(resource: RuntimeResourceBase<ResourceType>, command: UhnResourceCommand) {
        if (resource.type === "digitalOutput") {
            if (command.type !== "toggle" && command.type !== "set") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for digitalOutput resource` });
            }
            return;
        }

        if (resource.type === "digitalInput") {
            throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Commands cannot be sent to digitalInput resources` });
        }

        throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_TYPE", message: `Resource type ${resource.type} does not support commands` });
    }
}

