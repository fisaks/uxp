import { DeleteLocationItemOrderSchema, LocationItemOrderParams, SaveLocationItemOrderRequest, SaveLocationItemOrderSchema } from "@uhn/common";
import { Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { userLocationItemOrderService } from "../services/user-location-item-order.service";

export class UserLocationItemOrderController {

    @Route("get", "/user/location-item-orders", { authenticate: true })
    @UseQueryRunner({ transactional: false })
    async listLocationItemOrders(req: FastifyRequest, _reply: FastifyReply) {
        const user = req.user as Token;
        return await userLocationItemOrderService.listLocationItemOrders(user.username);
    }

    @Route("put", "/user/location-item-orders/:locationId", { authenticate: true, schema: SaveLocationItemOrderSchema })
    @UseQueryRunner({ transactional: true })
    async saveLocationItemOrder(req: FastifyRequest<{ Params: LocationItemOrderParams; Body: SaveLocationItemOrderRequest }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { locationId } = req.params;
        const { locationItems } = req.body;
        return await userLocationItemOrderService.saveLocationItemOrder(user.username, locationId, locationItems);
    }

    @Route("delete", "/user/location-item-orders/:locationId", { authenticate: true, schema: DeleteLocationItemOrderSchema })
    @UseQueryRunner({ transactional: true })
    async deleteLocationItemOrder(req: FastifyRequest<{ Params: LocationItemOrderParams }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { locationId } = req.params;
        await userLocationItemOrderService.deleteLocationItemOrder(user.username, locationId);
        return { locationId };
    }
}
