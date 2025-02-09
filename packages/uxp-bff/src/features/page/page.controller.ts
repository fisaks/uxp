import { Route, UseQueryRunner, createErrorResponse } from "@uxp/bff-common";
import { ErrorCodes, SchemaValidate } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { Page } from "../../db/entities/Page";

const GetPageSchema: SchemaValidate<undefined, { basepath: string }> = {
    querystring: {
        type: "object",
        properties: {
            basepath: { type: "string", minLength: 1 },
        },
        required: ["basepath"],
    },
};
/*
const routes = [
  { path: '/login/foo/*' },
  { path: '/login/foo/bar' },
  { path: '/login/*' },
  { path: '/login/foo' },
  { path: '/login/bar' }
];

routes.sort((a, b) => {
  const aParts = a.path.split('/');
  const bParts = b.path.split('/');
  
  // Compare lengths first
  if (aParts.length !== bParts.length) {
    return bParts.length - aParts.length;
  }
  
  // If lengths are equal, compare specificity
  for (let i = 0; i < aParts.length; i++) {
    if (aParts[i] === '*' && bParts[i] !== '*') {
      return 1;
    }
    if (aParts[i] !== '*' && bParts[i] === '*') {
      return -1;
    }
  }
  
  return 0;
});

console.log(routes);
*/

export class PageController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/page", {
        schema: GetPageSchema,
    })
    @UseQueryRunner()
    async getPageMetadata(req: FastifyRequest<{ Querystring: { basepath: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
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
