import { Route } from "@uxp/bff-common";
import {
    CastDeviceParams,
    CastDeviceParamsSchema,
    CastSeekRequest,
    CastSeekSchema,
    ChromecastsState,
    TvPairConfirmRequest,
    TvPairConfirmSchema,
    TvPowerRequest,
    TvPowerSchema,
} from "@vid/common";
import { FastifyRequest } from "fastify";
import { castService } from "../cast/cast.service";

/** The Chromecasts as they are, whoever cast to them: for the Chromecast page. */
export class ChromecastsController {
    @Route("get", "/chromecasts", { authenticate: true })
    async getState(): Promise<ChromecastsState> {
        return castService.monitor.getState();
    }

    @Route("post", "/chromecasts/:deviceId/play", { authenticate: true, schema: CastDeviceParamsSchema })
    async play(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.monitor.play(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/pause", { authenticate: true, schema: CastDeviceParamsSchema })
    async pause(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.monitor.pause(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/seek", { authenticate: true, schema: CastSeekSchema })
    async seek(req: FastifyRequest<{ Params: CastDeviceParams; Body: CastSeekRequest }>): Promise<ChromecastsState> {
        return castService.monitor.seek(req.params.deviceId, req.body.positionSec);
    }

    @Route("post", "/chromecasts/:deviceId/stop", { authenticate: true, schema: CastDeviceParamsSchema })
    async stop(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.monitor.stopCasting(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/reboot", { authenticate: true, schema: CastDeviceParamsSchema })
    async reboot(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.monitor.reboot(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/tv-pairing/start", { authenticate: true, schema: CastDeviceParamsSchema })
    async startTvPairing(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.monitor.startTvPairing(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/tv-pairing/confirm", { authenticate: true, schema: TvPairConfirmSchema })
    async confirmTvPairing(req: FastifyRequest<{ Params: CastDeviceParams; Body: TvPairConfirmRequest }>): Promise<ChromecastsState> {
        return castService.monitor.confirmTvPairing(req.params.deviceId, req.body.pin);
    }

    @Route("post", "/chromecasts/:deviceId/tv-pairing/forget", { authenticate: true, schema: CastDeviceParamsSchema })
    async forgetTvPairing(req: FastifyRequest<{ Params: CastDeviceParams }>): Promise<ChromecastsState> {
        return castService.monitor.forgetTvPairing(req.params.deviceId);
    }

    @Route("post", "/chromecasts/:deviceId/tv-power", { authenticate: true, schema: TvPowerSchema })
    async setTvPower(req: FastifyRequest<{ Params: CastDeviceParams; Body: TvPowerRequest }>): Promise<ChromecastsState> {
        return castService.monitor.setTvPower(req.params.deviceId, req.body.state);
    }
}
