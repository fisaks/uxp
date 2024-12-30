import { FastifyReply, FastifyRequest } from "fastify";
import { Route } from "@uxp/bff-common";

export class SampleController {
    @Route("get", "/template", { authenticate: true, roles: ["admin"] })
    async template(_req: FastifyRequest, _reply: FastifyReply) {
        return "Hello, world From H2C!";
    }
}
