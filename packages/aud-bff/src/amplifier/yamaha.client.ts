import { XMLParser } from "fast-xml-parser";

const REQUEST_TIMEOUT_MS = 3000;

/** The amplifier did not answer. */
export class YamahaUnreachableError extends Error {}

/** The amplifier answered but refused the command (RC other than 0), for example while it is starting up. */
export class YamahaCommandError extends Error {
    constructor(
        message: string,
        readonly returnCode: string
    ) {
        super(message);
    }
}

export type YamahaBasicStatus = {
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
    adaptiveDrc: boolean;
    cinemaDsp3d: boolean;
    dialogueLevel: number;
    dialogueLift: number;
};

export type YamahaTunerInfo = {
    band: string;
    /** In units of 10 kHz for FM and in kHz for AM, as the amplifier reports it. */
    frequency: number;
    programService: string;
    programType: string;
    radioText: string;
};

export type YamahaListItem = { id: string; title: string };

export type YamahaRange = { min: number; max: number; step: number };

/** What the amplifier model offers, as described by the amplifier itself. */
export type YamahaCapabilities = {
    soundPrograms: string[];
    volume: YamahaRange;
    bass: YamahaRange;
    treble: YamahaRange;
    subwooferTrim: YamahaRange;
    dialogueLevel: YamahaRange;
    dialogueLift: YamahaRange;
    /** The FM frequencies, in units of 10 kHz. */
    tunerFrequency: YamahaRange;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const toOnOff = (on: boolean) => (on ? "On" : "Off");
const toAutoOff = (auto: boolean) => (auto ? "Auto" : "Off");

/** A level in dB as the amplifier takes it: tenths of a dB. */
const dbValue = (db: number) => `<Val>${Math.round(db * 10)}</Val><Exp>1</Exp><Unit>dB</Unit>`;

const HTML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'" };

/** The amplifier sends radio text with HTML entities in it, for example "&amp;" for "&", on top of the XML escaping. */
const decodeEntities = (text: string) => text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (entity) => HTML_ENTITIES[entity]);

/** A Direct node is its text, or an object with the text next to its attributes. */
const directText = (direct: XmlNode): string => (typeof direct === "string" ? direct : direct["#text"]);

const asArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

/** A number the amplifier reports as Val and Exp, for example Val 10110 and Exp 2 is 101.10. */
const scaled = (node: XmlNode) => Number(node.Val) / 10 ** Number(node.Exp);

/**
 * Client for the "YamahaRemoteControl" XML interface of Yamaha AV receivers (tested with the RX-V673).
 * The amplifier describes the interface itself at /YamahaRemoteControl/desc.xml.
 */
export class YamahaClient {
    private readonly parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: false });
    // The amplifier is slow with concurrent requests, so they are sent one at a time.
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private readonly host: string) {}

    async getBasicStatus(): Promise<YamahaBasicStatus> {
        const status = (await this.get("<Main_Zone><Basic_Status>GetParam</Basic_Status></Main_Zone>")).Main_Zone.Basic_Status;
        const program = status.Surround.Program_Sel.Current;
        const video = status.Sound_Video;
        return {
            power: status.Power_Control.Power === "On",
            volumeDb: scaled(status.Volume.Lvl),
            muted: status.Volume.Mute !== "Off",
            input: status.Input.Input_Sel,
            soundProgram: program.Sound_Program,
            straight: program.Straight === "On",
            enhancer: program.Enhancer === "On",
            bass: scaled(video.Tone.Bass),
            treble: scaled(video.Tone.Treble),
            subwooferTrim: scaled(status.Volume.Subwoofer_Trim),
            pureDirect: video.Pure_Direct.Mode === "On",
            adaptiveDrc: video.Adaptive_DRC !== "Off",
            cinemaDsp3d: status.Surround._3D_Cinema_DSP !== "Off",
            dialogueLevel: Number(video.Dialogue_Adjust.Dialogue_Lvl),
            dialogueLift: Number(video.Dialogue_Adjust.Dialogue_Lift),
        };
    }

    /** The sleep timer that is set in minutes, 0 when it is off. The amplifier does not tell how much time is left. */
    async getSleepMinutes(): Promise<number> {
        const sleep = (await this.get("<Main_Zone><Power_Control><Sleep>GetParam</Sleep></Power_Control></Main_Zone>")).Main_Zone
            .Power_Control.Sleep;
        return Number.parseInt(String(sleep), 10) || 0;
    }

    async getTunerInfo(): Promise<YamahaTunerInfo> {
        const info = (await this.get("<Tuner><Play_Info>GetParam</Play_Info></Tuner>")).Tuner.Play_Info;
        const band: string = info.Tuning.Band;
        const meta = info.Meta_Info;
        return {
            band,
            frequency: Number(info.Tuning.Freq.Current.Val),
            programService: decodeEntities(meta.Program_Service),
            programType: decodeEntities(meta.Program_Type),
            // Some stations send the same text in both fields
            radioText: decodeEntities([...new Set<string>([meta.Radio_Text_A, meta.Radio_Text_B].filter(Boolean))].join(" ")),
        };
    }

    /** The inputs the amplifier lets us select. */
    async getInputs(): Promise<YamahaListItem[]> {
        const items = (await this.get("<Main_Zone><Input><Input_Sel_Item>GetParam</Input_Sel_Item></Input></Main_Zone>")).Main_Zone.Input
            .Input_Sel_Item;
        return this.selectableItems(items);
    }

    async getTunerPresets(): Promise<YamahaListItem[]> {
        const items = (
            await this.get("<Tuner><Play_Control><Preset><Preset_Sel_Item>GetParam</Preset_Sel_Item></Preset></Play_Control></Tuner>")
        ).Tuner.Play_Control.Preset.Preset_Sel_Item;
        return this.selectableItems(items);
    }

    /** The sound programs and the ranges of the settings of this amplifier model, read from its interface description. */
    async getCapabilities(): Promise<YamahaCapabilities> {
        const description = this.parser.parse(await this.fetchText("/YamahaRemoteControl/desc.xml")).Unit_Description;
        const mainZone = this.findMenu(description, (menu) => menu["@_YNC_Tag"] === "Main_Zone");
        const menu = (matches: (menu: XmlNode) => boolean, name: string): XmlNode => {
            const found = mainZone && this.findMenu(mainZone, matches);
            if (!found) {
                throw new YamahaCommandError(`The amplifier description has no ${name} menu`, "none");
            }
            return found;
        };
        const tuner = this.findMenu(description, (menu) => menu["@_YNC_Tag"] === "Tuner");
        // The slider of the FM frequency (the other FM menus only step up and down). Its range is "8750,10800,5": units of 10 kHz.
        const fmSlider = tuner && this.findMenu(tuner, (menu) => menu["@_Func_Ex"] === "Freq_FM" && menu.Put_2 !== undefined);
        if (!fmSlider) {
            throw new YamahaCommandError("The amplifier description has no FM frequency menu", "none");
        }
        return {
            soundPrograms: asArray(menu((m) => m["@_Func_Ex"] === "Program", "sound program").Put_2.Param_1.Direct).map(directText),
            volume: this.range(menu((m) => m["@_Func"] === "Vol_Lvl", "volume")),
            bass: this.range(menu((m) => m["@_Func"] === "Bass", "bass")),
            treble: this.range(menu((m) => m["@_Func"] === "Treble", "treble")),
            subwooferTrim: this.range(menu((m) => m["@_Func_Ex"] === "SW_Trim", "subwoofer trim")),
            dialogueLevel: this.range(menu((m) => m["@_Func_Ex"] === "Dialogue_Lvl", "dialogue level")),
            dialogueLift: this.range(menu((m) => m["@_Func_Ex"] === "Dialogue_Lift", "dialogue lift")),
            tunerFrequency: this.rawRange(fmSlider),
        };
    }

    setPower(on: boolean) {
        return this.put(`<Main_Zone><Power_Control><Power>${on ? "On" : "Standby"}</Power></Power_Control></Main_Zone>`);
    }

    /** The amplifier names the settings "Off", "30 min", "60 min", "90 min" and "120 min". */
    setSleepMinutes(minutes: number) {
        return this.put(`<Main_Zone><Power_Control><Sleep>${minutes === 0 ? "Off" : `${minutes} min`}</Sleep></Power_Control></Main_Zone>`);
    }

    /** The amplifier takes steps of 0.5 dB. */
    setVolume(volumeDb: number) {
        return this.put(
            `<Main_Zone><Volume><Lvl><Val>${Math.round(volumeDb * 10)}</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume></Main_Zone>`
        );
    }

    setMute(muted: boolean) {
        return this.put(`<Main_Zone><Volume><Mute>${toOnOff(muted)}</Mute></Volume></Main_Zone>`);
    }

    setInput(input: string) {
        return this.put(`<Main_Zone><Input><Input_Sel>${escapeXml(input)}</Input_Sel></Input></Main_Zone>`);
    }

    setSoundProgram(program: string) {
        return this.put(
            `<Main_Zone><Surround><Program_Sel><Current><Sound_Program>${escapeXml(program)}</Sound_Program></Current></Program_Sel></Surround></Main_Zone>`
        );
    }

    setStraight(on: boolean) {
        return this.put(
            `<Main_Zone><Surround><Program_Sel><Current><Straight>${toOnOff(on)}</Straight></Current></Program_Sel></Surround></Main_Zone>`
        );
    }

    setEnhancer(on: boolean) {
        return this.put(
            `<Main_Zone><Surround><Program_Sel><Current><Enhancer>${toOnOff(on)}</Enhancer></Current></Program_Sel></Surround></Main_Zone>`
        );
    }

    setBass(db: number) {
        return this.put(`<Main_Zone><Sound_Video><Tone><Bass>${dbValue(db)}</Bass></Tone></Sound_Video></Main_Zone>`);
    }

    setTreble(db: number) {
        return this.put(`<Main_Zone><Sound_Video><Tone><Treble>${dbValue(db)}</Treble></Tone></Sound_Video></Main_Zone>`);
    }

    setSubwooferTrim(db: number) {
        return this.put(`<Main_Zone><Volume><Subwoofer_Trim>${dbValue(db)}</Subwoofer_Trim></Volume></Main_Zone>`);
    }

    setPureDirect(on: boolean) {
        return this.put(`<Main_Zone><Sound_Video><Pure_Direct><Mode>${toOnOff(on)}</Mode></Pure_Direct></Sound_Video></Main_Zone>`);
    }

    setAdaptiveDrc(auto: boolean) {
        return this.put(`<Main_Zone><Sound_Video><Adaptive_DRC>${toAutoOff(auto)}</Adaptive_DRC></Sound_Video></Main_Zone>`);
    }

    setCinemaDsp3d(auto: boolean) {
        return this.put(`<Main_Zone><Surround><_3D_Cinema_DSP>${toAutoOff(auto)}</_3D_Cinema_DSP></Surround></Main_Zone>`);
    }

    setDialogueLevel(level: number) {
        return this.put(
            `<Main_Zone><Sound_Video><Dialogue_Adjust><Dialogue_Lvl>${level}</Dialogue_Lvl></Dialogue_Adjust></Sound_Video></Main_Zone>`
        );
    }

    setDialogueLift(level: number) {
        return this.put(
            `<Main_Zone><Sound_Video><Dialogue_Adjust><Dialogue_Lift>${level}</Dialogue_Lift></Dialogue_Adjust></Sound_Video></Main_Zone>`
        );
    }

    /** The frequency is in units of 10 kHz, the amplifier takes steps of 50 kHz. */
    setTunerFrequency(frequency: number) {
        return this.put(
            `<Tuner><Play_Control><Tuning><Freq><FM><Val>${frequency}</Val><Exp>2</Exp><Unit>MHz</Unit></FM></Freq></Tuning></Play_Control></Tuner>`
        );
    }

    /** Items with RW "R" are shown by the amplifier but cannot be selected, for example "No Preset". */
    private selectableItems(items: XmlNode): YamahaListItem[] {
        return Object.values<XmlNode>(items)
            .filter((item) => item.RW.includes("W"))
            .map((item) => ({ id: item.Param, title: item.Title }));
    }

    private findMenu(node: XmlNode, matches: (menu: XmlNode) => boolean): XmlNode | undefined {
        for (const menu of asArray<XmlNode>(node.Menu)) {
            if (matches(menu)) {
                return menu;
            }
            const found = this.findMenu(menu, matches);
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    /** The range of a slider menu, written as "min,max,step". Levels in dB are in tenths: the exponent is in Param_2. */
    private range(menu: XmlNode): YamahaRange {
        const { min, max, step } = this.rawRange(menu);
        const scale = menu.Put_2.Param_2 ? 10 ** Number(directText(menu.Put_2.Param_2.Direct)) : 1;
        return { min: min / scale, max: max / scale, step: step / scale };
    }

    /** The range of a slider menu as written in the description, without the exponent applied. */
    private rawRange(menu: XmlNode): YamahaRange {
        const [min, max, step] = String(menu.Put_2.Param_1.Range).split(",").map(Number);
        return { min, max, step };
    }

    private async get(body: string) {
        return this.send("GET", body);
    }

    private async put(body: string) {
        await this.send("PUT", body);
    }

    private send(command: "GET" | "PUT", body: string): Promise<XmlNode> {
        const run = async () => {
            const reply = this.parser.parse(
                await this.fetchText("/YamahaRemoteControl/ctrl", `<YAMAHA_AV cmd="${command}">${body}</YAMAHA_AV>`)
            ).YAMAHA_AV;
            const returnCode: string = reply["@_RC"];
            if (returnCode !== "0") {
                throw new YamahaCommandError(`The amplifier answered ${command} with RC ${returnCode}`, returnCode);
            }
            return reply;
        };
        const result = this.queue.then(run, run);
        this.queue = result.catch(() => undefined);
        return result;
    }

    private async fetchText(path: string, body?: string): Promise<string> {
        try {
            const response = await fetch(`http://${this.host}${path}`, {
                method: body === undefined ? "GET" : "POST",
                body,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (!response.ok) {
                throw new YamahaCommandError(`The amplifier answered HTTP ${response.status}`, String(response.status));
            }
            return await response.text();
        } catch (error) {
            if (error instanceof YamahaCommandError) {
                throw error;
            }
            throw new YamahaUnreachableError(
                `The amplifier at ${this.host} did not answer: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}
