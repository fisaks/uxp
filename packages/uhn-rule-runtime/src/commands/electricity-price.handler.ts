import { RuleRuntimeElectricityPriceCommand } from "@uhn/common";
import { RuntimeElectricityService } from "../services/runtime-electricity.service";

/**
 * Handles an incoming electricityPriceUpdate IPC command: stores the new price snapshot.
 *
 * Source: ElectricityPriceService (master) publishes via MQTT, host relays to runtime via IPC.
 */
export function handleElectricityPriceUpdate(electricityService: RuntimeElectricityService, cmd: RuleRuntimeElectricityPriceCommand) {
    electricityService.update(cmd.payload);
}
