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

/** A station of the station list. The frequency is in units of 10 kHz: 10110 is 101.10 MHz. */
export type TunerStation = {
    name: string;
    frequency: number;
    /** Marked in the station list: the short list of the System Center panel shows only these. */
    favorite?: boolean;
};

/** What the amplifier offers. Fetched from the amplifier once, so it is missing until the first successful poll. */
export type AmplifierInfo = {
    inputs: AmplifierInput[];
    soundPrograms: string[];
    /** The stations from the station list file, in the order of the file. */
    tunerStations: TunerStation[];
    /** The ranges the amplifier reports for its settings. */
    volume: AmplifierRange;
    bass: AmplifierRange;
    treble: AmplifierRange;
    subwooferTrim: AmplifierRange;
    dialogueLevel: AmplifierRange;
    dialogueLift: AmplifierRange;
    /** The FM frequencies the amplifier can tune, in units of 10 kHz. */
    tunerFrequency: AmplifierRange;
};

export type AmplifierTuner = {
    band: string;
    /** In units of 10 kHz for FM (10110 is 101.10 MHz) and in kHz for AM. */
    frequency: number;
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
