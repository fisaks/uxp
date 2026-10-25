import { WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { AmplifierState } from "./amplifier.type";

export type AudioAppActionPayloadRequestMap = {
    /** Starts the live amplifier updates. The response is the current state. */
    amplifier_subscribe: Record<string, never>;
    amplifier_set_power: { on: boolean };
    amplifier_set_volume: { volumeDb: number };
    amplifier_set_mute: { muted: boolean };
    amplifier_set_input: { input: string };
    amplifier_set_sound_program: { program: string };
    amplifier_set_straight: { on: boolean };
    amplifier_set_enhancer: { on: boolean };
    amplifier_set_tuner_preset: { preset: string };
    amplifier_set_bass: { db: number };
    amplifier_set_treble: { db: number };
    amplifier_set_subwoofer_trim: { db: number };
    amplifier_set_pure_direct: { on: boolean };
    amplifier_set_adaptive_drc: { on: boolean };
    amplifier_set_cinema_dsp_3d: { on: boolean };
    amplifier_set_dialogue_level: { level: number };
    amplifier_set_dialogue_lift: { level: number };
};

export type AudioAppActionPayloadResponseMap = {
    amplifier_subscribe: AmplifierState;
    /** Pushed to subscribers whenever the amplifier state changes. */
    amplifier_state: AmplifierState;
    amplifier_set_power: AmplifierState;
    amplifier_set_volume: AmplifierState;
    amplifier_set_mute: AmplifierState;
    amplifier_set_input: AmplifierState;
    amplifier_set_sound_program: AmplifierState;
    amplifier_set_straight: AmplifierState;
    amplifier_set_enhancer: AmplifierState;
    amplifier_set_tuner_preset: AmplifierState;
    amplifier_set_bass: AmplifierState;
    amplifier_set_treble: AmplifierState;
    amplifier_set_subwoofer_trim: AmplifierState;
    amplifier_set_pure_direct: AmplifierState;
    amplifier_set_adaptive_drc: AmplifierState;
    amplifier_set_cinema_dsp_3d: AmplifierState;
    amplifier_set_dialogue_level: AmplifierState;
    amplifier_set_dialogue_lift: AmplifierState;
};

export type AudioAppRequestMessage<Action extends WebSocketAction<AudioAppActionPayloadRequestMap>> = WebSocketMessage<
    Action,
    AudioAppActionPayloadRequestMap
>;
export type AudioAppResponseMessage<Action extends WebSocketAction<AudioAppActionPayloadResponseMap>> = WebSocketResponse<
    Action,
    AudioAppActionPayloadResponseMap
>;
