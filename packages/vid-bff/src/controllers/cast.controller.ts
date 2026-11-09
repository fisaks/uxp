import { Route } from "@uxp/bff-common";
import {
    CastDeviceParams,
    CastDeviceParamsSchema,
    CastQueueRequest,
    CastQueueSchema,
    CastRateRequest,
    CastRateSchema,
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
    async start(req: FastifyRequest<{ Body: CastStartRequest }>): Promise<CastState> {
        const { clipId, deviceIds, positionSec } = req.body;
        return castService.startOn(clipId, deviceIds, positionSec);
    }

    @Route("post", "/cast/sessions/:deviceId/play", { authenticate: true, schema: CastDeviceParamsSchema })
    async play(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<CastState> {
        return castService.play(req.params.deviceId);
    }

    @Route("post", "/cast/sessions/:deviceId/pause", { authenticate: true, schema: CastDeviceParamsSchema })
    async pause(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<CastState> {
        return castService.pause(req.params.deviceId);
    }

    @Route("post", "/cast/sessions/:deviceId/seek", { authenticate: true, schema: CastSeekSchema })
    async seek(req: FastifyRequest<{ Params: CastDeviceParams; Body: CastSeekRequest }>): Promise<CastState> {
        return castService.seek(req.params.deviceId, req.body.positionSec);
    }

    @Route("post", "/cast/sessions/:deviceId/rate", { authenticate: true, schema: CastRateSchema })
    async setRate(req: FastifyRequest<{ Params: CastDeviceParams; Body: CastRateRequest }>): Promise<CastState> {
        return castService.setRate(req.params.deviceId, req.body.rate);
    }

    @Route("post", "/cast/sessions/:deviceId/restart", { authenticate: true, schema: CastDeviceParamsSchema })
    async restart(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<CastState> {
        return castService.restart(req.params.deviceId);
    }

    @Route("post", "/cast/sessions/:deviceId/next", { authenticate: true, schema: CastDeviceParamsSchema })
    async next(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<CastState> {
        return castService.next(req.params.deviceId);
    }

    @Route("post", "/cast/players/:deviceId/queue", { authenticate: true, schema: CastQueueSchema })
    async editQueue(req: FastifyRequest<{ Params: CastDeviceParams; Body: CastQueueRequest }>): Promise<CastState> {
        return castService.editQueue(req.params.deviceId, req.body);
    }

    @Route("post", "/cast/sessions/:deviceId/stop", { authenticate: true, schema: CastDeviceParamsSchema })
    async stop(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<CastState> {
        return castService.stopSession(req.params.deviceId);
    }
}
