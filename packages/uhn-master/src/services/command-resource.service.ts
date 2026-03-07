import { isLogicalResource, isPhysicalResource, ResourceStateValue, RuntimeAnalogOutputResource, RuntimeDigitalInputResource, RuntimeDigitalOutputResource, RuntimeLogicalResource, RuntimeResource, RuntimeVirtualDigitalInputResource, UhnResourceCommand } from "@uhn/common";
import { AppErrorV2 } from "@uxp/bff-common";
import { blueprintResourceService } from "./blueprint-resource.service";
import { commandEdgeService } from "./command-edge.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";
import { stateRuntimeService } from "./state-runtime.service";
import { stateSignalService } from "./state-signal.service";
import { logicalResourceEdgeService } from "./logical-resource-edge.service";
import { logicalResourceStateService } from "./state-logical-resource.service";

/** Duration in ms for the simulated press pulse on virtualDigitalInput push tap. */
const VIRTUAL_PRESS_DURATION_MS = 300;

export class CommandsResourceService {

    async executeResourceCommand(resourceId: string, command: UhnResourceCommand): Promise<void> {
        const resource = blueprintResourceService.getResourceById(resourceId);
        if (!resource) {
            throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Resource with id ${resourceId} not found` });
        }
        this.validateResourceAddressability(resource);
        this.validateCommandForResource(resource, command);

        switch (resource.type) {
            case "timer":
                return this.handleTimer(resource as RuntimeLogicalResource);
            case "digitalOutput":
                return this.handleDigitalOutput(resource as RuntimeDigitalOutputResource, command);
            case "analogOutput":
                return this.handleAnalogOutput(resource as RuntimeAnalogOutputResource, command);
            case "digitalInput":
                return this.handleDigitalInput(resource as RuntimeDigitalInputResource, resourceId, command);
            case "complex":
                return this.handleComplex(resource as RuntimeLogicalResource);
            case "virtualDigitalInput":
                return this.handleVirtualDigitalInput(resource as RuntimeVirtualDigitalInputResource, resourceId, command);
        }
    }

    /* -------------------------------------------------- */
    /* Per-type command handlers                          */
    /* -------------------------------------------------- */

    private handleTimer(resource: RuntimeLogicalResource) {
        this.sendLogicalCommand(resource, { cmd: "timerCommand", payload: { resourceId: resource.id, action: "clear" } }, { action: "clear" });
    }

    private handleDigitalOutput(resource: RuntimeDigitalOutputResource, command: UhnResourceCommand) {
        commandEdgeService.sendDigitalCommandToEdge(resource, command);
    }

    private handleAnalogOutput(resource: RuntimeAnalogOutputResource, command: UhnResourceCommand) {
        if (command.type !== "setAnalog") return;
        let value = command.value;
        if (resource.min != null && value < resource.min) value = resource.min;
        if (resource.max != null && value > resource.max) value = resource.max;
        commandEdgeService.sendAnalogCommandToEdge(resource, value);
    }

    private handleDigitalInput(resource: RuntimeDigitalInputResource, resourceId: string, command: UhnResourceCommand) {
        if (command.type === "toggle") {
            const currentState = stateRuntimeService.getResourceState(resourceId);
            const currentValue = currentState?.value;
            const nextValue = (typeof currentValue === "boolean") ? !currentValue : true;
            stateSignalService.setSignalState(resource, nextValue);
        } else if (command.type === "press" || command.type === "release") {
            stateSignalService.setSignalState(resource, command.type === "press");
        }
    }

    private handleComplex(resource: RuntimeLogicalResource) {
        const timestamp = Date.now();
        this.sendLogicalCommand(resource,
            { cmd: "tapCommand", payload: { resourceId: resource.id, timestamp } },
            { action: "tap" },
        );
    }

    private handleVirtualDigitalInput(resource: RuntimeVirtualDigitalInputResource, resourceId: string, command: UhnResourceCommand) {
        if (resource.inputType === "toggle" && command.type === "toggle") {
            const currentState = stateRuntimeService.getResourceState(resourceId);
            const currentValue = currentState?.value;
            const nextValue = (typeof currentValue === "boolean") ? !currentValue : true;
            // Propagate through logicalResourceStateService (not directly to
            // stateRuntimeService) so the state is cached and survives blueprint reloads.
            this.setLogicalResourceState(resource, nextValue, Date.now());
        } else if (command.type === "tap") {
            // Simulate a brief press pulse (true → delay → false) for visual feedback
            // and to fire activated/deactivated rule triggers, mirroring how physical
            // push buttons produce a signal state change alongside the tap gesture.
            const timestamp = Date.now();
            this.setLogicalResourceState(resource, true, timestamp);
            this.sendLogicalCommand(resource,
                { cmd: "tapCommand", payload: { resourceId: resource.id, timestamp } },
                { action: "tap" },
            );
            setTimeout(() => {
                this.setLogicalResourceState(resource, false, Date.now());
            }, VIRTUAL_PRESS_DURATION_MS);
        }
    }

    /* -------------------------------------------------- */
    /* Logical resource routing helpers                   */
    /* -------------------------------------------------- */

    /**
     * Sets state for a logical resource, routing to master runtime or edge.
     * Propagates through logicalResourceStateService so the state is cached
     * and survives blueprint reloads.
     */
    private setLogicalResourceState(resource: RuntimeLogicalResource, value: ResourceStateValue, timestamp: number) {
        if (resource.host === "master") {
            ruleRuntimeProcessService.sendEvent<"stateUpdate">({
                cmd: "stateUpdate",
                payload: { resourceId: resource.id, value, timestamp },
            });
            logicalResourceStateService.handleLocalState({
                resourceId: resource.id, value, timestamp,
            });
        } else {
            logicalResourceEdgeService.sendCommandToEdge(
                { id: resource.id, host: resource.host },
                { action: "setState", value },
            );
        }
    }

    /** Routes a logical resource command to master runtime or edge. */
    private sendLogicalCommand(
        resource: RuntimeLogicalResource,
        runtimeEvent: Parameters<typeof ruleRuntimeProcessService.sendEvent>[0],
        edgeCommand: Parameters<typeof logicalResourceEdgeService.sendCommandToEdge>[1],
    ) {
        if (resource.host === "master") {
            ruleRuntimeProcessService.sendEvent(runtimeEvent);
        } else {
            logicalResourceEdgeService.sendCommandToEdge({ id: resource.id, host: resource.host }, edgeCommand);
        }
    }

    /* -------------------------------------------------- */
    /* Validation                                         */
    /* -------------------------------------------------- */

    private validateResourceAddressability(resource: RuntimeResource) {
        if (isLogicalResource(resource)) {
            if (!resource.host) {
                throw new AppErrorV2({ statusCode: 400, code: "RESOURCE_NOT_ADDRESSABLE", message: `${resource.type} resource ${resource.id} has no host` });
            }
            return;
        }

        if (isPhysicalResource(resource)) {
            if (!resource.edge || !resource.device || resource.pin == null) {
                throw new AppErrorV2({ statusCode: 400, code: "RESOURCE_NOT_ADDRESSABLE", message: `Resource ${resource.id} is not addressable` });
            }
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

        if (resource.type === "analogOutput") {
            if (command.type !== "setAnalog") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for analogOutput resource` });
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

        if (resource.type === "complex") {
            if (command.type !== "tap") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for complex resource` });
            }
            return;
        }

        if (resource.type === "virtualDigitalInput") {
            const viResource = resource as RuntimeVirtualDigitalInputResource;
            if (viResource.inputType === "push" && command.type !== "tap") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for virtualDigitalInput push resource` });
            }
            if (viResource.inputType === "toggle" && command.type !== "toggle") {
                throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_COMMAND", message: `Invalid command type ${command.type} for virtualDigitalInput toggle resource` });
            }
            return;
        }

        throw new AppErrorV2({ statusCode: 400, code: "INVALID_RESOURCE_TYPE", message: `Resource type ${resource.type} does not support commands` });
    }
}

