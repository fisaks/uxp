import { AudioAppRequestMessage, ChromecastSeekSchema } from "@aud/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { chromecastService } from "../chromecast/chromecast.service";

export class ChromecastHandler {
    @WebSocketAction("chromecast_subscribe", { authenticate: true })
    public subscribe(wsDetails: WebSocketDetails) {
        return chromecastService.subscribe(wsDetails.socket);
    }

    @WebSocketAction("chromecast_check", { authenticate: true })
    public check() {
        return chromecastService.checkHealth();
    }

    @WebSocketAction("chromecast_play", { authenticate: true })
    public play() {
        return chromecastService.play();
    }

    @WebSocketAction("chromecast_pause", { authenticate: true })
    public pause() {
        return chromecastService.pause();
    }

    @WebSocketAction("chromecast_seek", { authenticate: true, schema: ChromecastSeekSchema })
    public seek(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"chromecast_seek">) {
        return chromecastService.seek(message.payload.positionSec);
    }

    @WebSocketAction("chromecast_next", { authenticate: true })
    public next() {
        return chromecastService.next();
    }

    @WebSocketAction("chromecast_previous", { authenticate: true })
    public previous() {
        return chromecastService.previous();
    }

    @WebSocketAction("chromecast_stop_app", { authenticate: true })
    public stopApp() {
        return chromecastService.stopApp();
    }

    @WebSocketAction("chromecast_reboot", { authenticate: true })
    public reboot() {
        return chromecastService.reboot();
    }

    @WebSocketAction("chromecast_select_amp", { authenticate: true })
    public selectAmplifier() {
        return chromecastService.selectAmplifier();
    }
}
