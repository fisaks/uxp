/** A range the amplifier accepts, in the unit of the setting (dB for levels). */
export type AmplifierRange = {
    min: number;
    max: number;
    step: number;
};

export type AmplifierInput = {
    /** The value the amplifier uses for the input, for example "AV5" or "HDMI1". */
    id: string;
    label: string;
};

export type AmplifierTunerPreset = {
    id: string;
    title: string;
};

/** What the amplifier offers. Fetched from the amplifier once, so it is missing until the first successful poll. */
export type AmplifierInfo = {
    inputs: AmplifierInput[];
    soundPrograms: string[];
    tunerPresets: AmplifierTunerPreset[];
    /** The ranges the amplifier reports for its settings. */
    volume: AmplifierRange;
    bass: AmplifierRange;
    treble: AmplifierRange;
    subwooferTrim: AmplifierRange;
    dialogueLevel: AmplifierRange;
    dialogueLift: AmplifierRange;
};

export type AmplifierTuner = {
    band: string;
    frequency: string;
    /** The selected preset, or null when tuned manually. */
    presetId: string | null;
    programService: string;
    programType: string;
    radioText: string;
};

export type AmplifierStatus = {
    power: boolean;
    volumeDb: number;
    muted: boolean;
    input: string;
    soundProgram: string;
    straight: boolean;
    enhancer: boolean;
    bass: number;
    treble: number;
    subwooferTrim: number;
    pureDirect: boolean;
    /** True when set to Auto, false when Off. */
    adaptiveDrc: boolean;
    /** True when set to Auto, false when Off. */
    cinemaDsp3d: boolean;
    dialogueLevel: number;
    dialogueLift: number;
    /** Only present while the amplifier is on and the TUNER input is selected. */
    tuner?: AmplifierTuner;
};

export type AmplifierState = {
    reachable: boolean;
    info?: AmplifierInfo;
    /** The last status received. Kept while the amplifier is unreachable. Missing until the first successful poll. */
    status?: AmplifierStatus;
};
