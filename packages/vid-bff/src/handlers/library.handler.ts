import { WebSocketAction } from "@uxp/bff-common";
import { LibraryState } from "@vid/common";
import { scanTracker } from "../library/scan-tracker";

export class LibraryHandler {
    /** The scan state is pushed to every connection, so subscribing only gets the current state. */
    @WebSocketAction("library_subscribe", { authenticate: true })
    public subscribe(): LibraryState {
        return { scanning: scanTracker.scanning };
    }
}
