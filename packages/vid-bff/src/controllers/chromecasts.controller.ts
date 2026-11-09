import { Route } from "@uxp/bff-common";
import { CastDeviceParams, CastDeviceParamsSchema, CastSeekRequest, CastSeekSchema, ChromecastsState } from "@vid/common";
import { FastifyRequest } from "fastify";
import { castService } from "../cast/cast.service";

/** The Chromecasts as they are, whoever cast to them: for the Chromecast page. */
export class ChromecastsController {
    @Route("get", "/chromecasts", { authenticate: true })
    async getState(): Promise<ChromecastsState> {
        return castService.chromecasts.getState();
    }

    @Route("post", "/chromecasts/:deviceId/play", { authenticate: true, schema: CastDeviceParamsSchema })
    async play(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.chromecasts.play(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/pause", { authenticate: true, schema: CastDeviceParamsSchema })
    async pause(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.chromecasts.pause(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/seek", { authenticate: true, schema: CastSeekSchema })
    async seek(req: FastifyRequest<{ Params: CastDeviceParams; Body: CastSeekRequest }>): Promise<ChromecastsState> {
        return castService.chromecasts.seek(req.params.deviceId, req.body.positionSec);
    }

    @Route("post", "/chromecasts/:deviceId/stop", { authenticate: true, schema: CastDeviceParamsSchema })
    async stop(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.chromecasts.stopCasting(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/reboot", { authenticate: true, schema: CastDeviceParamsSchema })
    async reboot(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.chromecasts.reboot(req.params.deviceId);
    }
}
