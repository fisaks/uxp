import { Route, UseQueryRunner } from "@uxp/bff-common";
import { NavigationResponse } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { NavigationService } from "../../services/navigation.service";

export class NavigationController {

    @Route("get", "/navigation", { authenticate: false })
    @UseQueryRunner()
    async getNavigation(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const service = new NavigationService(queryRunner);

        const [routes, tags, system] = await Promise.all([
            service.getRoutes(),
            service.getTags(),
            service.getSystemCapabilities()
        ]);

        return {
            routes,
            tags,
            system: system
        } satisfies NavigationResponse;
    }
}
