import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { UseQueryRunner } from "../decorator/queryrunner.decorator";
import { Route } from "../decorator/route.decorator";

export class HealthController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("get", "/health", { authenticate: false })
    @UseQueryRunner()
    async register(_req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        if (queryRunner) {
            await queryRunner.query("SELECT 1");
        }
        reply.send({ status: "ok" });
    }
}
