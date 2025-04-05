import { AddFieldKeySchema, FieldKeyByTypeSchema, FieldKeyType, NewFieldKeyPayload, RemoveFieldKeyPayload, RemoveFieldKeySchema } from "@h2c/common";
import { Route, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { FieldKeysService } from "../services/fieldKeys.service";

export class FieldKeyController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("get", "/field-keys", { authenticate: true, roles: ["user"], schema: FieldKeyByTypeSchema })
    @UseQueryRunner()
    async getFieldKeys(req: FastifyRequest<{ Querystring: { types: FieldKeyType | FieldKeyType[] } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const service = new FieldKeysService(req, queryRunner);
        const { types } = req.query;

        const keys = await service.getAllByType(types);
        return keys;
    }

    @Route("put", "/field-keys", { authenticate: true, roles: ["user"], schema: AddFieldKeySchema })
    @UseQueryRunner()
    async addKey(req: FastifyRequest<{ Body: NewFieldKeyPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const service = new FieldKeysService(req, queryRunner);

        const key = await service.add(req.body.type, req.body.key);
        return key;
    }

    @Route("delete", "/field-keys", { authenticate: true, roles: ["user"], schema: RemoveFieldKeySchema })
    @UseQueryRunner()
    async removeKey(req: FastifyRequest<{ Querystring: RemoveFieldKeyPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const service = new FieldKeysService(req, queryRunner);

        await service.remove(req.query.type, req.query.key);

    }

}