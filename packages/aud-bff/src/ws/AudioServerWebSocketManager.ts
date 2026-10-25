import { AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap } from "@aud/common";
import { ServerWebSocketManager } from "@uxp/bff-common";

export class AudioServerWebSocketManager extends ServerWebSocketManager<AudioAppActionPayloadRequestMap, AudioAppActionPayloadResponseMap> {
    private static instance: AudioServerWebSocketManager | null = null;

    private constructor() {
        super();
    }

    static getInstance(): AudioServerWebSocketManager {
        return this.instance ?? (this.instance = new AudioServerWebSocketManager());
    }

    topicSize(topic: string): number {
        return this.topics.get(topic)?.size ?? 0;
    }
}
