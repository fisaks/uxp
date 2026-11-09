import { Route } from "@uxp/bff-common";
import {
    CastDeviceParams,
    CastDeviceParamsSchema,
    CastSeekRequest,
    CastSeekSchema,
    CastStartRequest,
    CastStartSchema,
    CastState,
} from "@vid/common";
import { FastifyRequest } from "fastify";
import { castService } from "../cast/cast.service";

export class CastController {
    @Route("get", "/cast", { authenticate: true })
    async getState(): Promise<CastState> {
        return castService.getState();
    }

    @Route("post", "/cast/refresh", { authenticate: true })
    async refresh(): Promise<CastState> {
        return castService.refresh();
    }

    @Route("post", "/cast/sessions", { authenticate: true, schema: CastStartSchema })
    async start(req: FastifyRequest): Promise<CastState> {
        const { clipId, deviceIds, positionSec } = req.body as CastStartRequest;
        return castService.startOn(clipId, deviceIds, positionSec);
    }

    @Route("post", "/cast/sessions/:deviceId/play", { authenticate: true, schema: CastDeviceParamsSchema })
    async play(req: FastifyRequest): Promise<CastState> {
        return castService.play((req.params as CastDeviceParams).deviceId);
    }

    @Route("post", "/cast/sessions/:deviceId/pause", { authenticate: true, schema: CastDeviceParamsSchema })
    async pause(req: FastifyRequest): Promise<CastState> {
        return castService.pause((req.params as CastDeviceParams).deviceId);
    }

    @Route("post", "/cast/sessions/:deviceId/seek", { authenticate: true, schema: CastSeekSchema })
    async seek(req: FastifyRequest): Promise<CastState> {
        return castService.seek((req.params as CastDeviceParams).deviceId, (req.body as CastSeekRequest).positionSec);
    }

    @Route("post", "/cast/sessions/:deviceId/restart", { authenticate: true, schema: CastDeviceParamsSchema })
    async restart(req: FastifyRequest): Promise<CastState> {
        return castService.restart((req.params as CastDeviceParams).deviceId);
    }

    @Route("post", "/cast/sessions/:deviceId/stop", { authenticate: true, schema: CastDeviceParamsSchema })
    async stop(req: FastifyRequest): Promise<CastState> {
        return castService.stopSession((req.params as CastDeviceParams).deviceId);
    }
}
