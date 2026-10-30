import {
    AudioAppRequestMessage,
    PlayerEnqueueSchema,
    PlayerIndexSchema,
    PlayerMoveSchema,
    PlayerPlayTracksSchema,
    PlayerSeekSchema,
    PlayerSetRepeatSchema,
    PlayerSetShuffleSchema,
} from "@aud/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { playerService } from "../player/player.service";

export class PlayerHandler {
    @WebSocketAction("player_subscribe", { authenticate: true })
    public subscribe(wsDetails: WebSocketDetails) {
        return playerService.subscribe(wsDetails.socket);
    }

    @WebSocketAction("player_play_tracks", { authenticate: true, schema: PlayerPlayTracksSchema })
    public playTracks(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_play_tracks">) {
        return playerService.playTracks(message.payload.trackIds, message.payload.startIndex);
    }

    @WebSocketAction("player_enqueue", { authenticate: true, schema: PlayerEnqueueSchema })
    public enqueue(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_enqueue">) {
        return playerService.enqueue(message.payload.trackIds);
    }

    @WebSocketAction("player_play_index", { authenticate: true, schema: PlayerIndexSchema })
    public playIndex(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_play_index">) {
        return playerService.playIndex(message.payload.index);
    }

    @WebSocketAction("player_remove", { authenticate: true, schema: PlayerIndexSchema })
    public remove(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_remove">) {
        return playerService.remove(message.payload.index);
    }

    @WebSocketAction("player_move", { authenticate: true, schema: PlayerMoveSchema })
    public move(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_move">) {
        return playerService.move(message.payload.from, message.payload.to);
    }

    @WebSocketAction("player_clear", { authenticate: true })
    public clear() {
        return playerService.clear();
    }

    @WebSocketAction("player_pause", { authenticate: true })
    public pause() {
        return playerService.pause();
    }

    @WebSocketAction("player_resume", { authenticate: true })
    public resume() {
        return playerService.resume();
    }

    @WebSocketAction("player_next", { authenticate: true })
    public next() {
        return playerService.next();
    }

    @WebSocketAction("player_previous", { authenticate: true })
    public previous() {
        return playerService.previous();
    }

    @WebSocketAction("player_seek", { authenticate: true, schema: PlayerSeekSchema })
    public seek(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_seek">) {
        return playerService.seek(message.payload.positionSec);
    }

    @WebSocketAction("player_set_shuffle", { authenticate: true, schema: PlayerSetShuffleSchema })
    public setShuffle(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_set_shuffle">) {
        return playerService.setShuffle(message.payload.on);
    }

    @WebSocketAction("player_set_repeat", { authenticate: true, schema: PlayerSetRepeatSchema })
    public setRepeat(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"player_set_repeat">) {
        return playerService.setRepeat(message.payload.mode);
    }
}
