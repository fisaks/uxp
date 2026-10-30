/** What an engine tells the player service about the file it plays. */
export type PlayerEngineListener = {
    /** Where the playing file is, in seconds. Called a few times a second while playing. */
    onPosition(positionSec: number): void;
    /** The file played to its end. Not called when it was stopped or replaced. */
    onEnded(): void;
    /** The file could not be played. */
    onError(message: string): void;
};

/** How a file is played. */
export type PlayOptions = {
    /** What the library knows of the length of the file, for engines that cannot find it out themselves. */
    durationSec?: number;
    /** Where in the file to start. */
    startSec: number;
    /**
     * True when a seek has to land on the exact place: variable bitrate music without a table of contents needs it. It makes
     * a seek far into a long file very slow (22 s to hour 10 of an audiobook on a Raspberry Pi 3), so a long constant bitrate
     * audiobook is played without it. Engines that do not need the difference ignore it.
     */
    accurateSeek: boolean;
};

/** Plays one file at a time: the part of the player that makes sound. */
export interface PlayerEngine {
    setListener(listener: PlayerEngineListener): void;
    /** Plays the file from `options.startSec`. */
    play(file: string, options: PlayOptions): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
    seek(positionSec: number): void;
}
