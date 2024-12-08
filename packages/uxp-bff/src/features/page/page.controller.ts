import { ErrorCodes, SchemaValidate } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { Page } from "../../db/entities/Page";

import { UseQueryRunner } from "../../decorator/queryrunner.decorator";
import { Route } from "../../decorator/route.decorator";
import { createErrorResponse } from "../../error/errorResponse";

const GetPageSchema: SchemaValidate<undefined, { basepath: string }> = {
    querystring: {
        type: "object",
        properties: {
            basepath: { type: "string", minLength: 1 },
        },
        required: ["basepath"],
    },
};

export class PageController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/page", {
        schema: GetPageSchema,
    })
    @UseQueryRunner()
    async getPageMetadata(
        req: FastifyRequest<{ Querystring: { basepath: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const basepath = req.query.basepath;

        const page = await queryRunner.manager.findOne(Page, {
            where: {
                baseurl: basepath,
            },
        });

        if (!page) {
            reply.code(404).send(createErrorResponse([{ code: ErrorCodes.NOT_FOUND, message: "Page Not Found" }], req));
        } else {
            reply.send({ metadata: page.metadata });
        }
    }
}
