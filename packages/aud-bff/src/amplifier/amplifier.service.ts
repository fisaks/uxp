import { AmplifierInfo, AmplifierRange, AmplifierState, AmplifierStatus } from "@aud/common";
import { AppErrorV2, AppLogger, WebSocketDetails } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { AudioServerWebSocketManager } from "../ws/AudioServerWebSocketManager";
import { AmplifierConfig, amplifierConfig } from "./amplifier.config";
import { YamahaClient, YamahaCommandError, YamahaUnreachableError } from "./yamaha.client";

const AMPLIFIER_TOPIC = "amplifier";
const TUNER_INPUT = "TUNER";
const POLL_INTERVAL_MS = 5000;
// The amplifier needs a moment to apply a command, so the state is read back after this delay.
const CONFIRM_DELAY_MS = 1000;

/**
 * Keeps the state of the amplifier and pushes changes to subscribed clients.
 * The amplifier is only polled while at least one client is subscribed.
 */
export class AmplifierService {
    private state: AmplifierState = { reachable: false };
    private polling = false;
    private confirmTimer?: NodeJS.Timeout;

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

    setPower(on: boolean) {
        return this.execute(() => this.client.setPower(on), { power: on });
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

    setTunerPreset(preset: string) {
        this.requireOption(
            this.requireInfo().tunerPresets.map((p) => p.id),
            preset,
            "tuner preset"
        );
        return this.execute(() => this.client.setTunerPreset(preset), {});
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
        const status: AmplifierStatus = await this.client.getBasicStatus();
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
            const [amplifierInputs, capabilities, tunerPresets] = await Promise.all([
                this.client.getInputs(),
                this.client.getCapabilities(),
                this.client.getTunerPresets(),
            ]);
            return { inputs: this.selectInputs(amplifierInputs), tunerPresets, ...capabilities };
        } catch (error) {
            AppLogger.warn(undefined, { message: "Could not read the options of the amplifier", error });
            return undefined;
        }
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
