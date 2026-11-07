import { VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap } from "@vid/common";
import { ServerWebSocketManager } from "@uxp/bff-common";

export class VideoServerWebSocketManager extends ServerWebSocketManager<VideoAppActionPayloadRequestMap, VideoAppActionPayloadResponseMap> {
    private static instance: VideoServerWebSocketManager | null = null;

    private constructor() {
        super();
    }

    static getInstance(): VideoServerWebSocketManager {
        return this.instance ?? (this.instance = new VideoServerWebSocketManager());
    }
}
