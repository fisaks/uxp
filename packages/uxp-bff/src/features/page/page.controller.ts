import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { Page } from "../../db/entities/Page";
import { UseQueryRunner } from "../../decorator/queryrunner.decorator";
import { Route } from "../../decorator/route.decorator";

const GetPageSchema = {
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
  @Route("get", "/api/page", {
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
      reply.code(404).send({ error: "Page not found" });
    } else {
      reply.send({ metadata: page.metadata });
    }
  }
}
