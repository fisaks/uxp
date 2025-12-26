import { DeviceCommandPayload, RuntimeResourceBase, UhnResourceCommand } from "@uhn/common";
import { nanoid } from "nanoid";
import mqttService from "./mqtt.service";


class DeviceCommandService {

    sendResourceCommandToDevice(resource: RuntimeResourceBase<"digitalOutput">,
        command: UhnResourceCommand) {
        const deviceCommand = this.mapOutputCommand(resource, command);
        this.sendDeviceCommand(resource.edge, resource.device!, deviceCommand);

    }
    private sendDeviceCommand(edge: string, device: string, cmd: DeviceCommandPayload) {
        const topic = `uhn/${edge}/device/${device}/cmd`;
        if (cmd.id === undefined) {
            cmd.id = nanoid();
        }
        mqttService.publish(topic, cmd);
    }

    private mapOutputCommand(
        resource: RuntimeResourceBase<"digitalOutput">,
        command: UhnResourceCommand
    ): DeviceCommandPayload {
        const id = nanoid();
        switch (command.type) {
            case "toggle":
                return {
                    id,
                    action: "setdigitaloutput",
                    device: resource.device,
                    address: resource.pin!,
                    value: 2,
                };

            case "set":
                return {
                    id,
                    action: "setdigitaloutput",
                    device: resource.device,
                    address: resource.pin!,
                    value: command.value ? 1 : 0,
                };

            default:
                throw new Error(`Unsupported output command: ${command.type}`);
        }
    }
}
export const deviceCommandService = new DeviceCommandService();
