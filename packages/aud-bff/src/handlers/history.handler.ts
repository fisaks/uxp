import { WebSocketAction } from "@uxp/bff-common";
import { historyService } from "../history/history.service";

export class HistoryHandler {
    @WebSocketAction("history_get", { authenticate: true })
    public get() {
        return historyService.get();
    }

    @WebSocketAction("history_clear", { authenticate: true })
    public clear() {
        return historyService.clear();
    }
}
