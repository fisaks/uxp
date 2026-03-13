import { SaveLocationSectionOrderRequest, SaveLocationSectionOrderSchema } from "@uhn/common";
import { Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { userLocationSectionOrderService } from "../services/user-location-section-order.service";

export class UserLocationSectionOrderController {

    @Route("get", "/user/location-section-order", { authenticate: true })
    @UseQueryRunner({ transactional: false })
    async getLocationSectionOrder(req: FastifyRequest, _reply: FastifyReply) {
        const user = req.user as Token;
        return await userLocationSectionOrderService.getLocationSectionOrder(user.username);
    }

    @Route("put", "/user/location-section-order", { authenticate: true, schema: SaveLocationSectionOrderSchema })
    @UseQueryRunner({ transactional: true })
    async saveLocationSectionOrder(req: FastifyRequest<{ Body: SaveLocationSectionOrderRequest }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { locationIds } = req.body;
        return await userLocationSectionOrderService.saveLocationSectionOrder(user.username, locationIds);
    }

    @Route("delete", "/user/location-section-order", { authenticate: true })
    @UseQueryRunner({ transactional: true })
    async deleteLocationSectionOrder(req: FastifyRequest, _reply: FastifyReply) {
        const user = req.user as Token;
        await userLocationSectionOrderService.deleteLocationSectionOrder(user.username);
        _reply.code(204).send();
    }
}
