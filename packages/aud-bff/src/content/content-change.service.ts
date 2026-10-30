import { EventEmitter } from "events";
import { HistoryEventMap, historyService } from "../history/history.service";
import { LibraryEventMap, audiobookService, libraryService } from "../library/library.service";
import { PlaylistEventMap, playlistService } from "../playlists/playlist.service";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { WebSocketDetails } from "@uxp/bff-common";

const CONTENT_TOPIC = "content";

/**
 * Tells the browsers that the music or the audiobook library or the playlists have changed, so that the lists they show, which they keep, are asked
 * for again: a scan that has found something new, or a playlist that was changed in another window.
 */
export class ContentChangeService {
    constructor(
        libraries: EventEmitter<LibraryEventMap>[],
        playlists: EventEmitter<PlaylistEventMap>,
        history: EventEmitter<HistoryEventMap>,
        private readonly wsManager: AudioServerWebSocketManager
    ) {
        libraries.forEach((library) => library.on("changed", () => this.broadcast("library_changed")));
        playlists.on("changed", () => this.broadcast("playlists_changed"));
        history.on("changed", () => this.broadcast("history_changed"));
    }

    subscribe(socket: WebSocketDetails["socket"]) {
        this.wsManager.joinTopic(socket, CONTENT_TOPIC);
        return {};
    }

    private broadcast(action: "library_changed" | "playlists_changed" | "history_changed") {
        this.wsManager.broadcastToTopic(CONTENT_TOPIC, { action, success: true, payload: {} });
    }
}

export const contentChangeService = new ContentChangeService(
    [libraryService, audiobookService],
    playlistService,
    historyService,
    AudioServerWebSocketManager.getInstance()
);
