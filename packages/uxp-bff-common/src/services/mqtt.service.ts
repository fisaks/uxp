import { connect, IClientOptions, ISubscriptionGrant, MqttClient, Packet } from "mqtt";
import { AppLogger } from "../utils/AppLogger";


export type MqttHandler = (topic: string, payload: unknown) => void;

type TopicMatchesParams = {
    pattern: string,
    topic: string
}
type PublishOption = {
    qos?: 0 | 1 | 2;
    retain?: boolean;
}
type SubscribeOption = {
    qos: 0 | 1 | 2;
}
export function topicMatches({ pattern, topic }: TopicMatchesParams): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; ++i) {
        const pat = patternParts[i];
        const top = topicParts[i];

        if (pat === "#") return true;
        if (pat === "+") continue;
        if (top === undefined) return false;
        if (pat !== top) return false;
    }
    // '#' can only appear at the end, so length must also match for exact (no #)
    return patternParts.length === topicParts.length;
}

export interface MqttServiceOptions {
    brokerUrl: string;
    clientOptions?: IClientOptions;
    onConnect?: () => void;
    onReconnect?: () => void;
    onClose?: () => void;
    onError?: (err: Error) => void;
}

export class MqttService {
    private client: MqttClient | null = null;
    private handlers: Map<string, Set<MqttHandler>> = new Map();
    private connected = false;

    constructor(options: MqttServiceOptions) {
        const { brokerUrl, clientOptions } = options;
        this.client = connect(brokerUrl, clientOptions);

        this.client.on("connect", () => {
            this.connected = true;
            if (options.onConnect) options.onConnect();
            else AppLogger.info(undefined, { message: `[MQTT] Connected to ${brokerUrl}` });
        });

        this.client.on("reconnect", () => {
            if (options.onReconnect) options.onReconnect();
            else AppLogger.info(undefined, { message: `[MQTT] Reconnecting...` });
        });

        this.client.on("close", () => {
            this.connected = false;
            if (options.onClose) options.onClose();
            else AppLogger.warn(undefined, { message: `[MQTT] Connection closed.` });
        });

        this.client.on("error", (err: Error) => {
            if (options.onError) options.onError(err);
            else AppLogger.error(undefined, { message: `[MQTT] Error:`, error: err });
        });

        this.client.on("message", (topic, payload) => {
            Array.from(this.handlers.entries())
                .filter(([pattern]) => topicMatches({ pattern, topic }))
                .forEach(([_, handlerSet]) => {
                    let decoded: any = payload;
                    try { decoded = JSON.parse(payload.toString()); } catch { }
                    handlerSet.forEach((h: any) => h(topic, decoded));
                });
        });
    }

    isConnected() {
        return this.connected;
    }

    publish(topic: string, message: unknown, options?: PublishOption) {
        if (!this.client) throw new Error("MQTT not initialized!");
        this.client.publish(topic, this.toMqttPayload(message), options);
    }

    async publishAsync(topic: string, message: unknown, options?: PublishOption): Promise<Packet | undefined> {
        if (!this.client) throw new Error("MQTT not initialized!");

        return this.client.publishAsync(topic, this.toMqttPayload(message), options);
    }
    private toMqttPayload(message: unknown): string | Buffer {
        if (message == null) {
            return Buffer.alloc(0);
        }
        return typeof message === "string" ? message : JSON.stringify(message);
    }

    subscribe(pattern: string, handler: MqttHandler, options?: SubscribeOption) {
        if (!this.client) throw new Error("MQTT not initialized!");
        if (!this.handlers.has(pattern)) {
            this.handlers.set(pattern, new Set());
            this.client.subscribe(pattern, options);
        }
        this.handlers.get(pattern)!.add(handler);
    }

    async subscribeAsync(pattern: string, handler: MqttHandler, options?: SubscribeOption): Promise<ISubscriptionGrant[] | undefined> {
        if (!this.client) throw new Error("MQTT not initialized!");
        if (!this.handlers.has(pattern)) {
            this.handlers.set(pattern, new Set());
            return this.client.subscribeAsync(pattern, options)
                .then((g) => { this.handlers.get(pattern)!.add(handler); return g; });
        }
        this.handlers.get(pattern)!.add(handler);
        return undefined;
    }

    unsubscribe(pattern: string, handler?: MqttHandler) {
        if (!this.client) return;
        const set = this.handlers.get(pattern);
        if (!set) return;
        if (handler) {
            set.delete(handler);
            if (set.size === 0) {
                this.handlers.delete(pattern);
                this.client.unsubscribe(pattern);
            }
        } else {
            this.handlers.delete(pattern);
            this.client.unsubscribe(pattern);
        }
    }

    disconnect() {
        this.client?.end();
        this.client = null;
        this.handlers.clear();
        this.connected = false;
    }
}
