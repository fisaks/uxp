
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { TopicService } from "../services/topic.service";
import { TopicPatternSchema, UHNAppRequestMessage } from "@uhn/common";

export class TopicHandler {
    private topicService: TopicService;
    constructor() { 
        this.topicService = new TopicService();
    }
    @WebSocketAction("topic:subscribe", { authenticate: true, schema: TopicPatternSchema })
    public async topicPatternSubscribe(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"topic:subscribe">
    ) {
        
        const { topicPattern } = message.payload;
            AppLogger.info(wsDetails.requestMeta, {
            message: `Subscribing to topic pattern: ${message.payload.topicPattern}`
        });
        this.topicService.subscribeToTopicPattern(wsDetails.socket, topicPattern);
        return message.payload;
    }

    @WebSocketAction("topic:unsubscribe", { authenticate: true, schema: TopicPatternSchema })
    public async topicPatternUnsubscribe(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"topic:unsubscribe">
    ) {
        const { topicPattern } = message.payload;
        AppLogger.info(wsDetails.requestMeta, {
            message: `Unsubscribing from topic pattern: ${message.payload.topicPattern}`
        });
        this.topicService.unsubscribeFromTopicPattern(wsDetails.socket, topicPattern);
        return message.payload;
    }
}