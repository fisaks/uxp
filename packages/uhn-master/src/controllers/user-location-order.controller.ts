import { DeleteLocationOrderSchema, LocationOrderParams, SaveLocationOrderRequest, SaveLocationOrderSchema } from "@uhn/common";
import { Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { userLocationOrderService } from "../services/user-location-order.service";

export class UserLocationOrderController {

    @Route("get", "/user/location-orders", { authenticate: true })
    @UseQueryRunner({ transactional: false })
    async listLocationOrders(req: FastifyRequest, _reply: FastifyReply) {
        const user = req.user as Token;
        return await userLocationOrderService.listLocationOrders(user.username);
    }

    @Route("put", "/user/location-orders/:locationId", { authenticate: true, schema: SaveLocationOrderSchema })
    @UseQueryRunner({ transactional: true })
    async saveLocationOrder(req: FastifyRequest<{ Params: LocationOrderParams; Body: SaveLocationOrderRequest }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { locationId } = req.params;
        const { locationItems } = req.body;
        return await userLocationOrderService.saveLocationOrder(user.username, locationId, locationItems);
    }

    @Route("delete", "/user/location-orders/:locationId", { authenticate: true, schema: DeleteLocationOrderSchema })
    @UseQueryRunner({ transactional: true })
    async deleteLocationOrder(req: FastifyRequest<{ Params: LocationOrderParams }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { locationId } = req.params;
        await userLocationOrderService.deleteLocationOrder(user.username, locationId);
        return { locationId };
    }
}
