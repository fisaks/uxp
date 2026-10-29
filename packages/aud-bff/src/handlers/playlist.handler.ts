import {
    AudioAppRequestMessage,
    PlaylistAddTracksSchema,
    PlaylistCreateSchema,
    PlaylistIdSchema,
    PlaylistMoveTrackSchema,
    PlaylistRemoveTrackSchema,
    PlaylistRenameSchema,
} from "@aud/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { playlistService } from "../playlists/playlist.service";

export class PlaylistHandler {
    @WebSocketAction("playlist_list", { authenticate: true })
    public list() {
        return playlistService.list();
    }

    @WebSocketAction("playlist_get", { authenticate: true, schema: PlaylistIdSchema })
    public get(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_get">) {
        return playlistService.get(message.payload.id);
    }

    @WebSocketAction("playlist_create", { authenticate: true, schema: PlaylistCreateSchema })
    public create(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_create">) {
        return playlistService.create(message.payload.name, message.payload.trackIds);
    }

    @WebSocketAction("playlist_rename", { authenticate: true, schema: PlaylistRenameSchema })
    public rename(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_rename">) {
        return playlistService.rename(message.payload.id, message.payload.name);
    }

    @WebSocketAction("playlist_delete", { authenticate: true, schema: PlaylistIdSchema })
    public delete(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_delete">) {
        return playlistService.delete(message.payload.id);
    }

    @WebSocketAction("playlist_add_tracks", { authenticate: true, schema: PlaylistAddTracksSchema })
    public addTracks(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_add_tracks">) {
        return playlistService.addTracks(message.payload.id, message.payload.trackIds);
    }

    @WebSocketAction("playlist_remove_track", { authenticate: true, schema: PlaylistRemoveTrackSchema })
    public removeTrack(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_remove_track">) {
        return playlistService.removeTrack(message.payload.id, message.payload.index);
    }

    @WebSocketAction("playlist_move_track", { authenticate: true, schema: PlaylistMoveTrackSchema })
    public moveTrack(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"playlist_move_track">) {
        return playlistService.moveTrack(message.payload.id, message.payload.from, message.payload.to);
    }
}
