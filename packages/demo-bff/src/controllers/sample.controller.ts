import { Route } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";

export class SampleController {
    @Route("get", "/template")
    async template(_req: FastifyRequest, _reply: FastifyReply) {
        return "Hello, world!";
    }

    @Route("get", "/super-template", { authenticate: true, roles: ["admin"] })
    async superTemplate(_req: FastifyRequest, _reply: FastifyReply) {
        return "Hello, Super user!";
    }
}
