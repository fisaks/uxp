import { CreateApiTokenSchema, RevokeApiTokenSchema } from "@uhn/common";
import { AppLogger, Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { apiTokenService } from "../services/api-token.service";

export class ApiTokenController {

    @Route("post", "/api-tokens", { authenticate: true, roles: ["admin"], schema: CreateApiTokenSchema })
    @UseQueryRunner({ transactional: true })
    async createToken(req: FastifyRequest, _reply: FastifyReply) {
        const { label, blueprintIdentifier } = req.body as { label: string; blueprintIdentifier: string };
        const user = req.user as Token;

        AppLogger.info(req, { message: `API token creation requested by ${user.username} for blueprint "${blueprintIdentifier}"` });

        return await apiTokenService.createToken(label, blueprintIdentifier, user.username);
    }

    @Route("get", "/api-tokens", { authenticate: true, roles: ["admin"] })
    @UseQueryRunner({ transactional: false })
    async listTokens(_req: FastifyRequest, _reply: FastifyReply) {
        return await apiTokenService.listTokens();
    }

    @Route("delete", "/api-tokens/:id", { authenticate: true, roles: ["admin"], schema: RevokeApiTokenSchema })
    @UseQueryRunner({ transactional: true })
    async revokeToken(req: FastifyRequest, _reply: FastifyReply) {
        const { id } = req.params as { id: number };
        const user = req.user as Token;

        AppLogger.info(req, { message: `API token ${id} revocation requested by ${user.username}` });

        await apiTokenService.revokeToken(id);
        return { id };
    }
}
