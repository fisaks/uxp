import { Route } from "@uxp/bff-common";
import {
    Playlist,
    PlaylistParams,
    PlaylistParamsSchema,
    PlaylistRenameRequest,
    PlaylistRenameSchema,
    PlaylistSaveRequest,
    PlaylistSaveSchema,
} from "@vid/common";
import { FastifyRequest } from "fastify";
import { playlistService } from "../playlist/playlist.service";

/** Every call answers with the playlists as they are after it. */
export class PlaylistController {
    @Route("get", "/playlists", { authenticate: true })
    async list(): Promise<Playlist[]> {
        return playlistService.list();
    }

    @Route("post", "/playlists", { authenticate: true, schema: PlaylistSaveSchema })
    async save(req: FastifyRequest<{ Body: PlaylistSaveRequest }>): Promise<Playlist[]> {
        const { deviceId, name, replace } = req.body;
        return playlistService.save(deviceId, name, replace ?? false);
    }

    @Route("patch", "/playlists/:id", { authenticate: true, schema: PlaylistRenameSchema })
    async rename(req: FastifyRequest<{ Params: PlaylistParams; Body: PlaylistRenameRequest }>): Promise<Playlist[]> {
        return playlistService.rename(req.params.id, req.body.name);
    }

    @Route("delete", "/playlists/:id", { authenticate: true, schema: PlaylistParamsSchema })
    async remove(req: FastifyRequest<{ Params: PlaylistParams }>): Promise<Playlist[]> {
        return playlistService.remove(req.params.id);
    }
}
