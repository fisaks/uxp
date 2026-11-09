import { Route } from "@uxp/bff-common";
import { CastDeviceParams, CastDeviceParamsSchema, CastSeekRequest, CastSeekSchema, ChromecastsState } from "@vid/common";
import { FastifyRequest } from "fastify";
import { castService } from "../cast/cast.service";

const deviceOf = (req: FastifyRequest) => (req.params as CastDeviceParams).deviceId;

/** The Chromecasts as they are, whoever cast to them: for the Chromecast page. */
export class ChromecastsController {
    @Route("get", "/chromecasts", { authenticate: true })
    async getState(): Promise<ChromecastsState> {
        return castService.chromecasts.getState();
    }

    @Route("post", "/chromecasts/:deviceId/play", { authenticate: true, schema: CastDeviceParamsSchema })
    async play(req: FastifyRequest): Promise<ChromecastsState> {
        return castService.chromecasts.play(deviceOf(req));
    }

    @Route("post", "/chromecasts/:deviceId/pause", { authenticate: true, schema: CastDeviceParamsSchema })
    async pause(req: FastifyRequest): Promise<ChromecastsState> {
        return castService.chromecasts.pause(deviceOf(req));
    }

    @Route("post", "/chromecasts/:deviceId/seek", { authenticate: true, schema: CastSeekSchema })
    async seek(req: FastifyRequest): Promise<ChromecastsState> {
        return castService.chromecasts.seek(deviceOf(req), (req.body as CastSeekRequest).positionSec);
    }

    @Route("post", "/chromecasts/:deviceId/stop", { authenticate: true, schema: CastDeviceParamsSchema })
    async stop(req: FastifyRequest): Promise<ChromecastsState> {
        return castService.chromecasts.stopCasting(deviceOf(req));
    }

    @Route("post", "/chromecasts/:deviceId/reboot", { authenticate: true, schema: CastDeviceParamsSchema })
    async reboot(req: FastifyRequest): Promise<ChromecastsState> {
        return castService.chromecasts.reboot(deviceOf(req));
    }
}
