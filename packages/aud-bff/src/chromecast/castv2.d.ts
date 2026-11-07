// Minimal typings for the parts of `castv2` that are used here.
declare module "castv2" {
    import { EventEmitter } from "events";

    export class Channel extends EventEmitter {
        send(data: unknown): void;
        close(): void;
        on(event: "message", listener: (data: any, broadcast: boolean) => void): this;
    }

    export class Client extends EventEmitter {
        connect(options: { host: string; port?: number }, callback: () => void): void;
        close(): void;
        createChannel(sourceId: string, destinationId: string, namespace: string, encoding: "JSON"): Channel;
        on(event: "error", listener: (error: Error) => void): this;
        on(event: "close", listener: () => void): this;
    }
}
