import { UHNAppRequestMessage } from "@uhn/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { electricityPriceService } from "../services/electricity-price.service";

export class ElectricityHandler {

    @WebSocketAction("uhn:electricity:refresh", { authenticate: true })
    public async refreshPrices(
        _wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:electricity:refresh">,
    ) {
        await electricityPriceService.refresh();
        return message.id ? message : undefined;
    }
}
