/** What an engine tells the player service about the file it plays. */
export type PlayerEngineListener = {
    /** Where the playing file is, in seconds. Called a few times a second while playing. */
    onPosition(positionSec: number): void;
    /** The file played to its end. Not called when it was stopped or replaced. */
    onEnded(): void;
    /** The file could not be played. */
    onError(message: string): void;
};

/** Plays one file at a time: the part of the player that makes sound. */
export interface PlayerEngine {
    setListener(listener: PlayerEngineListener): void;
    /** Plays the file from its start. `durationSec` is what the library knows, for engines that cannot find it out themselves. */
    play(file: string, durationSec?: number): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
    seek(positionSec: number): void;
}
