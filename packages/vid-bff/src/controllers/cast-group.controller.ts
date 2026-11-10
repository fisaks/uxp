import { Route } from "@uxp/bff-common";
import {
    CastGroup,
    CastGroupParams,
    CastGroupParamsSchema,
    CastGroupRequest,
    CastGroupRun,
    CastGroupStartRequest,
    CastGroupStartSchema,
    CastGroupSaveSchema,
    CastGroupUpdateSchema,
} from "@vid/common";
import { FastifyRequest } from "fastify";
import { castService } from "../cast/cast.service";
import { castGroupService } from "../cast/cast-group.service";

/** Every call answers with the groups as they are after it. */
export class CastGroupController {
    @Route("get", "/cast/groups", { authenticate: true })
    async list(): Promise<CastGroup[]> {
        return castGroupService.list();
    }

    @Route("post", "/cast/groups", { authenticate: true, schema: CastGroupSaveSchema })
    async create(req: FastifyRequest<{ Body: CastGroupRequest }>): Promise<CastGroup[]> {
        return castGroupService.create(req.body);
    }

    @Route("put", "/cast/groups/:id", { authenticate: true, schema: CastGroupUpdateSchema })
    async update(req: FastifyRequest<{ Params: CastGroupParams; Body: CastGroupRequest }>): Promise<CastGroup[]> {
        castService.requireGroupIdle(req.params.id);
        return castGroupService.update(req.params.id, req.body);
    }

    @Route("delete", "/cast/groups/:id", { authenticate: true, schema: CastGroupParamsSchema })
    async remove(req: FastifyRequest<{ Params: CastGroupParams }>): Promise<CastGroup[]> {
        castService.requireGroupIdle(req.params.id);
        return castGroupService.remove(req.params.id);
    }

    @Route("post", "/cast/groups/:id/start", { authenticate: true, schema: CastGroupStartSchema })
    async start(req: FastifyRequest<{ Params: CastGroupParams; Body: CastGroupStartRequest }>): Promise<CastGroupRun> {
        return castService.startGroup(req.params.id, req.body.clipId, req.body.positionSec);
    }

    @Route("get", "/cast/groups/:id/run", { authenticate: true, schema: CastGroupParamsSchema })
    async run(req: FastifyRequest<{ Params: CastGroupParams }>): Promise<CastGroupRun> {
        return castService.groupRun(req.params.id);
    }

    @Route("post", "/cast/groups/:id/stop", { authenticate: true, schema: CastGroupParamsSchema })
    async stop(req: FastifyRequest<{ Params: CastGroupParams }>): Promise<CastGroup[]> {
        castService.stopGroup(req.params.id);
        return castGroupService.list();
    }
}
