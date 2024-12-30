import { ErrorCodes, MenuItemResponse, UserRole } from "@uxp/common";
import { createErrorResponse, Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";

import { MenuItem } from "../../db/entities/MenuItem";

export class MenuController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/menu-items", { authenticate: false })
    @UseQueryRunner()
    async getMenu(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const { roles } = req.user ? (req.user as Token) : { roles: [] as UserRole[] };

        const menuItems = await queryRunner.manager.find(MenuItem);

        if (!menuItems) {
            reply
                .code(404)
                .send(createErrorResponse([{ code: ErrorCodes.NOT_FOUND, message: "Menu items Not Found" }], req));
        } else {
            console.log("FFF", menuItems, roles, req.user);
            reply.send({
                menuItems: menuItems
                    .filter((f) => f.roles.length === 0 || f.roles.some((s) => roles.includes(s)))
                    .map((m) => {
                        const { name, url, metadata } = m;
                        return { name, url, metadata };
                    }),
            } as MenuItemResponse);
        }
    }
}
