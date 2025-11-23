import { TopicPatternSchema, UHNAppRequestMessage } from "@uhn/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { TopicService } from "../services/topic.service";

export class TopicHandler {

    @WebSocketAction("topic:subscribe", { authenticate: true, schema: TopicPatternSchema })
    public async topicPatternSubscribe(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"topic:subscribe">
    ) {
        
        const { topicPattern } = message.payload;
        const topicService = new TopicService(wsDetails.requestMeta);
        AppLogger.info(wsDetails.requestMeta, {
            message: `Subscribing to topic pattern: ${message.payload.topicPattern}`
        });
        topicService.subscribeToTopicPattern(wsDetails.socket, topicPattern);
        return message.payload;
    }

    @WebSocketAction("topic:unsubscribe", { authenticate: true, schema: TopicPatternSchema })
    public async topicPatternUnsubscribe(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"topic:unsubscribe">
    ) {
        const { topicPattern } = message.payload;
        const topicService = new TopicService(wsDetails.requestMeta);
        AppLogger.info(wsDetails.requestMeta, {
            message: `Unsubscribing from topic pattern: ${message.payload.topicPattern}`
        });
        topicService.unsubscribeFromTopicPattern(wsDetails.socket, topicPattern);
        return message.payload;
    }
}