import { AmplifierInfo, AmplifierRange, AmplifierReachability, AmplifierState, AmplifierStatus, TunerStation } from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { AmplifierConfig, amplifierConfig } from "./amplifier.config";
import { stationsFromPresets } from "./tuner-stations";
import { YamahaClient, YamahaCommandError, YamahaUnreachableError } from "./yamaha.client";

const AMPLIFIER_TOPIC = "amplifier";
const TUNER_INPUT = "TUNER";
const POLL_INTERVAL_MS = 5000;
// The amplifier needs a moment to apply a command, so the state is read back after this delay.
const CONFIRM_DELAY_MS = 1000;
// After it is told to switch on, the amplifier is asked every half second until it says it is on.
const POWER_ON_POLL_MS = 500;
const POWER_ON_ATTEMPTS = 20;
// An input may not be accepted while the amplifier is still starting up.
const INPUT_ATTEMPTS = 3;
const INPUT_RETRY_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Keeps the state of the amplifier and pushes changes to subscribed clients.
 * The amplifier is only polled while at least one client is subscribed.
 */
export class AmplifierService {
    private state: AmplifierState = { reachable: false };
    private polling = false;
    private confirmTimer?: NodeJS.Timeout;
    private preparing?: Promise<void>;

    constructor(
        private readonly client: YamahaClient,
        private readonly config: AmplifierConfig,
        private readonly wsManager: AudioServerWebSocketManager
    ) {}

    async subscribe(socket: WebSocketDetails["socket"]): Promise<AmplifierState> {
        this.wsManager.joinTopic(socket, AMPLIFIER_TOPIC);
        if (!this.polling) {
            this.polling = true;
            await this.refresh();
            this.scheduleNextPoll();
        }
        return this.state;
    }

    /** For the health check. While clients are subscribed the polled state tells it, otherwise the amplifier is asked once. */
    async checkReachable(): Promise<AmplifierReachability> {
        if (this.polling) {
            return { reachable: this.state.reachable };
        }
        try {
            await this.client.getBasicStatus();
            return { reachable: true };
        } catch {
            return { reachable: false };
        }
    }

    /**
     * For the player, so that music can be heard without setting up the amplifier by hand: turns the amplifier on and
     * selects the input of the player (`AUD_AMPLIFIER_PLAYER_INPUT`), if it is not already. The volume and the mute
     * are left as they are. It does nothing when no input is configured, and it never throws: the music plays
     * whether or not the amplifier can be reached. A call while one is running joins it.
     */
    prepareForPlayback(): Promise<void> {
        const input = this.config.playerInput;
        if (!input) {
            return Promise.resolve();
        }
        this.preparing ??= this.selectForPlayback(input).finally(() => (this.preparing = undefined));
        return this.preparing;
    }

    private async selectForPlayback(input: string) {
        try {
            // Read from the amplifier itself: the state kept here is up to 5 seconds old, or not polled at all.
            const status = await this.client.getBasicStatus();
            const wasOff = !status.power;
            if (wasOff) {
                await this.client.setPower(true);
                await this.waitUntilOn();
            }
            if (status.input !== input) {
                await this.setInputWithRetry(input, wasOff ? INPUT_ATTEMPTS : 1);
            }
            if (wasOff || status.input !== input) {
                void this.refresh();
            }
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not set up the amplifier for playing music", error });
        }
    }

    private async waitUntilOn() {
        for (let attempt = 0; attempt < POWER_ON_ATTEMPTS; attempt++) {
            await sleep(POWER_ON_POLL_MS);
            if ((await this.client.getBasicStatus()).power) {
                return;
            }
        }
        throw new Error("The amplifier did not switch on");
    }

    private async setInputWithRetry(input: string, attempts: number) {
        for (let attempt = 1; ; attempt++) {
            try {
                return await this.client.setInput(input);
            } catch (error) {
                if (attempt >= attempts) {
                    throw error;
                }
                await sleep(INPUT_RETRY_MS);
            }
        }
    }

    setPower(on: boolean) {
        return this.execute(() => this.client.setPower(on), { power: on });
    }

    setSleep(minutes: number) {
        return this.execute(() => this.client.setSleepMinutes(minutes), { sleepMinutes: minutes });
    }

    setVolume(volumeDb: number) {
        const volume = this.snap(volumeDb, this.requireInfo().volume);
        return this.execute(() => this.client.setVolume(volume), { volumeDb: volume });
    }

    setMute(muted: boolean) {
        return this.execute(() => this.client.setMute(muted), { muted });
    }

    setInput(input: string) {
        this.requireOption(
            this.requireInfo().inputs.map((i) => i.id),
            input,
            "input"
        );
        return this.execute(() => this.client.setInput(input), { input });
    }

    setSoundProgram(program: string) {
        this.requireOption(this.requireInfo().soundPrograms, program, "sound program");
        return this.execute(() => this.client.setSoundProgram(program), { soundProgram: program });
    }

    setStraight(on: boolean) {
        return this.execute(() => this.client.setStraight(on), { straight: on });
    }

    setEnhancer(on: boolean) {
        return this.execute(() => this.client.setEnhancer(on), { enhancer: on });
    }

    setBass(db: number) {
        const bass = this.snap(db, this.requireInfo().bass);
        return this.execute(() => this.client.setBass(bass), { bass });
    }

    setTreble(db: number) {
        const treble = this.snap(db, this.requireInfo().treble);
        return this.execute(() => this.client.setTreble(treble), { treble });
    }

    setSubwooferTrim(db: number) {
        const subwooferTrim = this.snap(db, this.requireInfo().subwooferTrim);
        return this.execute(() => this.client.setSubwooferTrim(subwooferTrim), { subwooferTrim });
    }

    setPureDirect(on: boolean) {
        return this.execute(() => this.client.setPureDirect(on), { pureDirect: on });
    }

    setAdaptiveDrc(on: boolean) {
        return this.execute(() => this.client.setAdaptiveDrc(on), { adaptiveDrc: on });
    }

    setCinemaDsp3d(on: boolean) {
        return this.execute(() => this.client.setCinemaDsp3d(on), { cinemaDsp3d: on });
    }

    setDialogueLevel(level: number) {
        const dialogueLevel = this.snap(level, this.requireInfo().dialogueLevel);
        return this.execute(() => this.client.setDialogueLevel(dialogueLevel), { dialogueLevel });
    }

    setDialogueLift(level: number) {
        const dialogueLift = this.snap(level, this.requireInfo().dialogueLift);
        return this.execute(() => this.client.setDialogueLift(dialogueLift), { dialogueLift });
    }

    setTunerFrequency(frequency: number) {
        const tunerFrequency = this.snap(frequency, this.requireInfo().tunerFrequency);
        const tuner = this.state.status?.tuner;
        // The name and text of the previous station would be wrong until the amplifier has read the new one.
        const expected = tuner
            ? { tuner: { ...tuner, frequency: tunerFrequency, programService: "", programType: "", radioText: "" } }
            : {};
        return this.execute(() => this.client.setTunerFrequency(tunerFrequency), expected);
    }

    /** The nearest value the amplifier accepts: a whole number of steps from the lowest value, inside the range. */
    private snap(value: number, { min, max, step }: AmplifierRange) {
        const snapped = Number((min + Math.round((value - min) / step) * step).toFixed(3));
        return Math.min(Math.max(snapped, min), max);
    }

    private scheduleNextPoll() {
        setTimeout(async () => {
            if (this.wsManager.topicSize(AMPLIFIER_TOPIC) === 0) {
                this.polling = false;
                return;
            }
            await this.refresh();
            this.scheduleNextPoll();
        }, POLL_INTERVAL_MS);
    }

    /** Reads the amplifier and publishes the result. Never throws. */
    private async refresh() {
        try {
            const status = await this.readStatus();
            this.update({ reachable: true, info: await this.readInfoOnce(), status });
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not read the amplifier", error });
            this.update({ ...this.state, reachable: false });
        }
    }

    private async readStatus(): Promise<AmplifierStatus> {
        const basic = await this.client.getBasicStatus();
        // The sleep timer only runs while the amplifier is on.
        const status: AmplifierStatus = { ...basic, sleepMinutes: basic.power ? await this.client.getSleepMinutes() : 0 };
        if (status.power && status.input === TUNER_INPUT) {
            status.tuner = await this.client.getTunerInfo();
        }
        return status;
    }

    /** The options of the amplifier do not change, so they are read once. A failure is retried on the next poll. */
    private async readInfoOnce(): Promise<AmplifierInfo | undefined> {
        if (this.state.info) {
            return this.state.info;
        }
        try {
            const [amplifierInputs, capabilities, tunerStations] = await Promise.all([
                this.client.getInputs(),
                this.client.getCapabilities(),
                this.readTunerStations(),
            ]);
            return { inputs: this.selectInputs(amplifierInputs), tunerStations, ...capabilities };
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not read the options of the amplifier", error });
            return undefined;
        }
    }

    /** The station list of the configuration, or the presets stored in the amplifier when there is none. */
    private async readTunerStations(): Promise<TunerStation[]> {
        return this.config.tunerStations ?? stationsFromPresets(await this.client.getTunerPresets());
    }

    private selectInputs(amplifierInputs: { id: string; title: string }[]): AmplifierInfo["inputs"] {
        if (!this.config.inputs) {
            return amplifierInputs.map(({ id, title }) => ({ id, label: title }));
        }
        return this.config.inputs.flatMap(({ id, label }) => {
            const input = amplifierInputs.find((i) => i.id === id);
            if (!input) {
                AppLogger.warn(undefined, { message: `Configured input "${id}" is not offered by the amplifier` });
                return [];
            }
            return [{ id, label: label ?? input.title }];
        });
    }

    private async execute(send: () => Promise<void>, expected: Partial<AmplifierStatus>): Promise<AmplifierState> {
        try {
            await send();
        } catch (error) {
            throw this.toAppError(error);
        }
        if (this.state.status) {
            this.update({ ...this.state, status: { ...this.state.status, ...expected } });
        }
        // Commands can follow each other quickly (dragging the volume), so only the last one is read back.
        clearTimeout(this.confirmTimer);
        this.confirmTimer = setTimeout(() => void this.refresh(), CONFIRM_DELAY_MS);
        return this.state;
    }

    private update(next: AmplifierState) {
        if (JSON.stringify(next) === JSON.stringify(this.state)) {
            return;
        }
        this.state = next;
        this.wsManager.broadcastToTopic(AMPLIFIER_TOPIC, { action: "amplifier_state", success: true, payload: next });
    }

    private requireInfo(): AmplifierInfo {
        if (!this.state.info) {
            throw new AppErrorV2({
                statusCode: 503,
                code: ErrorCodes.INVALID_STATE,
                message: "The amplifier options are not available yet",
            });
        }
        return this.state.info;
    }

    private requireOption(options: string[], value: string, what: string) {
        if (!options.includes(value)) {
            throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.VALIDATION, message: `Unknown ${what} "${value}"` });
        }
    }

    private toAppError(error: unknown): unknown {
        if (error instanceof YamahaUnreachableError) {
            return new AppErrorV2({ statusCode: 503, code: ErrorCodes.DISCONNECTED, message: error.message, originalError: error });
        }
        if (error instanceof YamahaCommandError) {
            return new AppErrorV2({ statusCode: 409, code: ErrorCodes.INVALID_STATE, message: error.message, originalError: error });
        }
        return error;
    }
}

export const amplifierService = new AmplifierService(
    new YamahaClient(amplifierConfig.host),
    amplifierConfig,
    AudioServerWebSocketManager.getInstance()
);
