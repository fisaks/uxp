import { AddFavoriteRequest, AddFavoriteSchema, RemoveFavoriteParams, RemoveFavoriteSchema, ReorderFavoritesRequest, ReorderFavoritesSchema } from "@uhn/common";
import { Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { userFavoriteService } from "../services/user-favorite.service";

export class UserFavoriteController {

    @Route("get", "/user/favorites", { authenticate: true })
    @UseQueryRunner({ transactional: false })
    async listFavorites(req: FastifyRequest, _reply: FastifyReply) {
        const user = req.user as Token;
        return await userFavoriteService.listFavorites(user.username);
    }

    @Route("post", "/user/favorites", { authenticate: true, schema: AddFavoriteSchema })
    @UseQueryRunner({ transactional: true })
    async addFavorite(req: FastifyRequest<{ Body: AddFavoriteRequest }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { itemKind, itemRefId } = req.body;
        return await userFavoriteService.addFavorite(user.username, itemKind, itemRefId);
    }

    @Route("delete", "/user/favorites/:id", { authenticate: true, schema: RemoveFavoriteSchema })
    @UseQueryRunner({ transactional: true })
    async removeFavorite(req: FastifyRequest<{ Params: RemoveFavoriteParams }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { id } = req.params;
        await userFavoriteService.removeFavorite(id, user.username);
        return { id };
    }

    @Route("delete", "/user/favorites", { authenticate: true })
    @UseQueryRunner({ transactional: true })
    async removeAllFavorites(req: FastifyRequest, _reply: FastifyReply) {
        const user = req.user as Token;
        const count = await userFavoriteService.removeAllFavorites(user.username);
        return { count };
    }

    @Route("put", "/user/favorites/reorder", { authenticate: true, schema: ReorderFavoritesSchema })
    @UseQueryRunner({ transactional: true })
    async reorderFavorites(req: FastifyRequest<{ Body: ReorderFavoritesRequest }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { orderedIds } = req.body;
        return await userFavoriteService.reorderFavorites(user.username, orderedIds);
    }
}
