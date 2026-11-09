import { CastDevice } from "@vid/common";
import { AppLogger } from "@uxp/bff-common";
import Bonjour, { Browser, Service } from "bonjour-service";

const SERVICE_TYPE = "googlecast";
// A device that did not hear the first question, or was asleep, would stay unlisted: ask again now and then.
const REQUERY_MS = 30000;

export type FoundDevice = CastDevice & { host: string };

/** Keeps the list of the Chromecasts on the network, from the mDNS announcements. A device that says goodbye is dropped. */
export class CastDiscovery {
    private readonly found = new Map<string, FoundDevice>();
    private bonjour?: Bonjour;
    private browser?: Browser;
    private requery?: NodeJS.Timeout;

    constructor(
        private readonly onChange: () => void,
        /** A device that is new, or came back at another address. */
        private readonly onFound: (device: FoundDevice) => void
    ) {}

    start() {
        this.bonjour = new Bonjour();
        this.browser = this.bonjour.find({ type: SERVICE_TYPE }, (service) => this.add(service));
        this.browser.on("down", (service: Service) => this.remove(service));
        this.requery = setInterval(() => this.refresh(), REQUERY_MS);
    }

    stop() {
        clearInterval(this.requery);
        this.browser?.stop();
        this.bonjour?.destroy();
    }

    /** Asks the network again. Devices that answer show up through the change callback. */
    refresh() {
        this.browser?.update();
    }

    list(): FoundDevice[] {
        return [...this.found.values()].sort((a, b) => a.name.localeCompare(b.name));
    }

    get(id: string): FoundDevice | undefined {
        return this.found.get(id);
    }

    private add(service: Service) {
        const txt = service.txt as Record<string, string | undefined> | undefined;
        const id = txt?.id;
        const host = service.addresses?.find((address) => !address.includes(":"));
        if (!id || !host) {
            return;
        }
        const device: FoundDevice = { id, host, name: txt?.fn || service.name, model: txt?.md ?? "" };
        const known = this.found.get(id);
        this.found.set(id, device);
        if (!known) {
            AppLogger.info(undefined, { message: `[Cast] Found "${device.name}" (${device.model}) at ${host}` });
        }
        if (!known || known.host !== host || known.name !== device.name) {
            this.onChange();
        }
        if (!known || known.host !== host) {
            this.onFound(device);
        }
    }

    private remove(service: Service) {
        const id = (service.txt as Record<string, string | undefined> | undefined)?.id;
        if (id && this.found.delete(id)) {
            AppLogger.info(undefined, { message: `[Cast] Lost the device ${id}` });
            this.onChange();
        }
    }
}
