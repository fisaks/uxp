import {
    AmplifierSetAdaptiveDrcSchema,
    AmplifierSetCinemaDsp3dSchema,
    AmplifierSetDialogueSchema,
    AmplifierSetEnhancerSchema,
    AmplifierSetInputSchema,
    AmplifierSetMuteSchema,
    AmplifierSetPowerSchema,
    AmplifierSetPureDirectSchema,
    AmplifierSetSoundProgramSchema,
    AmplifierSetStraightSchema,
    AmplifierSetToneSchema,
    AmplifierSetTunerFrequencySchema,
    AmplifierSetVolumeSchema,
    AudioAppRequestMessage,
} from "@aud/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { amplifierService } from "../amplifier/amplifier.service";

export class AmplifierHandler {
    @WebSocketAction("amplifier_subscribe", { authenticate: true })
    public subscribe(wsDetails: WebSocketDetails) {
        return amplifierService.subscribe(wsDetails.socket);
    }

    @WebSocketAction("amplifier_set_power", { authenticate: true, schema: AmplifierSetPowerSchema })
    public setPower(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_power">) {
        return amplifierService.setPower(message.payload.on);
    }

    @WebSocketAction("amplifier_set_volume", { authenticate: true, schema: AmplifierSetVolumeSchema })
    public setVolume(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_volume">) {
        return amplifierService.setVolume(message.payload.volumeDb);
    }

    @WebSocketAction("amplifier_set_mute", { authenticate: true, schema: AmplifierSetMuteSchema })
    public setMute(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_mute">) {
        return amplifierService.setMute(message.payload.muted);
    }

    @WebSocketAction("amplifier_set_input", { authenticate: true, schema: AmplifierSetInputSchema })
    public setInput(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_input">) {
        return amplifierService.setInput(message.payload.input);
    }

    @WebSocketAction("amplifier_set_sound_program", { authenticate: true, schema: AmplifierSetSoundProgramSchema })
    public setSoundProgram(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_sound_program">) {
        return amplifierService.setSoundProgram(message.payload.program);
    }

    @WebSocketAction("amplifier_set_straight", { authenticate: true, schema: AmplifierSetStraightSchema })
    public setStraight(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_straight">) {
        return amplifierService.setStraight(message.payload.on);
    }

    @WebSocketAction("amplifier_set_enhancer", { authenticate: true, schema: AmplifierSetEnhancerSchema })
    public setEnhancer(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_enhancer">) {
        return amplifierService.setEnhancer(message.payload.on);
    }

    @WebSocketAction("amplifier_set_tuner_frequency", { authenticate: true, schema: AmplifierSetTunerFrequencySchema })
    public setTunerFrequency(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_tuner_frequency">) {
        return amplifierService.setTunerFrequency(message.payload.frequency);
    }

    @WebSocketAction("amplifier_set_bass", { authenticate: true, schema: AmplifierSetToneSchema })
    public setBass(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_bass">) {
        return amplifierService.setBass(message.payload.db);
    }

    @WebSocketAction("amplifier_set_treble", { authenticate: true, schema: AmplifierSetToneSchema })
    public setTreble(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_treble">) {
        return amplifierService.setTreble(message.payload.db);
    }

    @WebSocketAction("amplifier_set_subwoofer_trim", { authenticate: true, schema: AmplifierSetToneSchema })
    public setSubwooferTrim(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_subwoofer_trim">) {
        return amplifierService.setSubwooferTrim(message.payload.db);
    }

    @WebSocketAction("amplifier_set_pure_direct", { authenticate: true, schema: AmplifierSetPureDirectSchema })
    public setPureDirect(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_pure_direct">) {
        return amplifierService.setPureDirect(message.payload.on);
    }

    @WebSocketAction("amplifier_set_adaptive_drc", { authenticate: true, schema: AmplifierSetAdaptiveDrcSchema })
    public setAdaptiveDrc(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_adaptive_drc">) {
        return amplifierService.setAdaptiveDrc(message.payload.on);
    }

    @WebSocketAction("amplifier_set_cinema_dsp_3d", { authenticate: true, schema: AmplifierSetCinemaDsp3dSchema })
    public setCinemaDsp3d(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_cinema_dsp_3d">) {
        return amplifierService.setCinemaDsp3d(message.payload.on);
    }

    @WebSocketAction("amplifier_set_dialogue_level", { authenticate: true, schema: AmplifierSetDialogueSchema })
    public setDialogueLevel(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_dialogue_level">) {
        return amplifierService.setDialogueLevel(message.payload.level);
    }

    @WebSocketAction("amplifier_set_dialogue_lift", { authenticate: true, schema: AmplifierSetDialogueSchema })
    public setDialogueLift(_wsDetails: WebSocketDetails, message: AudioAppRequestMessage<"amplifier_set_dialogue_lift">) {
        return amplifierService.setDialogueLift(message.payload.level);
    }
}
