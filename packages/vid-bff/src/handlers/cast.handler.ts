import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { castService } from "../cast/cast.service";

export class CastHandler {
    @WebSocketAction("cast_subscribe", { authenticate: true })
    public subscribe(wsDetails: WebSocketDetails) {
        return castService.subscribe(wsDetails.socket);
    }

    @WebSocketAction("chromecasts_subscribe", { authenticate: true })
    public subscribeChromecasts(wsDetails: WebSocketDetails) {
        return castService.monitor.subscribe(wsDetails.socket);
    }
}
