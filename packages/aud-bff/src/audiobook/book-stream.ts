import { createReadStream } from "fs";
import { open, stat } from "fs/promises";
import { Readable } from "stream";

/** The audio of one file: where it starts and ends once the tags around it are left out, and what it is made of. */
export type AudioWindow = { file: string; start: number; end: number; bitrateKbps: number; sampleRate: number; mono: boolean };

/** The audio of the parts of a book as one mp3: the windows of the parts one after the other. */
export type BookStream = { windows: AudioWindow[]; size: number; startsSec: number[]; totalSec: number };

/** The parts of a book cannot be joined into one mp3 by laying their bytes end to end. */
export class NotJoinableError extends Error {}

/** What differs between MPEG-1 layer 3 (32-48 kHz) and MPEG-2 layer 3 (16-24 kHz, as in the DAISY books). */
type Mpeg = { bitrates: number[]; sampleRates: number[]; frameFactor: number; sideInfoMono: number; sideInfoStereo: number };
const MPEG1_L3: Mpeg = {
    bitrates: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    sampleRates: [44100, 48000, 32000],
    frameFactor: 144000,
    sideInfoMono: 17,
    sideInfoStereo: 32,
};
const MPEG2_L3: Mpeg = {
    bitrates: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    sampleRates: [22050, 24000, 16000],
    frameFactor: 72000,
    sideInfoMono: 9,
    sideInfoStereo: 17,
};
/** The second byte of a frame header without the protection bit: sync, MPEG version and layer 3. */
const MPEG1_L3_BYTE = 0xfa;
const MPEG2_L3_BYTE = 0xf2;
const ID3V2_HEADER = 10;
const ID3V1_SIZE = 128;
const FRAME_HEADER = 4;

const frameLength = (mpeg: Mpeg, bitrateKbps: number, sampleRate: number, padding: number) =>
    Math.floor((mpeg.frameFactor * bitrateKbps) / sampleRate) + padding;

/** Reads the audio window of a file: it skips the ID3v2 tag in front, the Xing/Info frame after it and the ID3v1 tag at the end. Only constant bitrate MPEG-1 or MPEG-2 layer 3 passes. */
const readAudioWindow = async (file: string): Promise<AudioWindow> => {
    const notJoinable = (reason: string) => new NotJoinableError(`${file}: ${reason}`);
    const { size } = await stat(file);
    const handle = await open(file, "r");
    try {
        const read = async (position: number, length: number) => {
            const buffer = Buffer.alloc(length);
            const { bytesRead } = await handle.read(buffer, 0, length, position);
            return buffer.subarray(0, bytesRead);
        };
        let start = 0;
        const head = await read(0, ID3V2_HEADER);
        if (head.length === ID3V2_HEADER && head.toString("latin1", 0, 3) === "ID3") {
            const tagSize = ((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f);
            start = ID3V2_HEADER + tagSize + (head[5] & 0x10 ? ID3V2_HEADER : 0);
        }
        const frame = await read(start, 64);
        const versionByte = frame[1] & 0xfe;
        if (frame.length < 64 || frame[0] !== 0xff || (versionByte !== MPEG1_L3_BYTE && versionByte !== MPEG2_L3_BYTE)) {
            throw notJoinable("not MPEG-1 or MPEG-2 layer 3");
        }
        const mpeg = versionByte === MPEG1_L3_BYTE ? MPEG1_L3 : MPEG2_L3;
        const bitrateKbps = mpeg.bitrates[frame[2] >> 4];
        const sampleRate = mpeg.sampleRates[(frame[2] >> 2) & 3];
        if (!bitrateKbps || !sampleRate) throw notJoinable("unusable frame header");
        const mono = frame[3] >> 6 === 3;
        const sideInfo = mono ? mpeg.sideInfoMono : mpeg.sideInfoStereo;
        const tag = frame.toString("latin1", FRAME_HEADER + sideInfo, FRAME_HEADER + sideInfo + 4);
        if (tag === "Xing") throw notJoinable("variable bitrate");
        if (tag === "Info") {
            start += frameLength(mpeg, bitrateKbps, sampleRate, (frame[2] >> 1) & 1);
        } else {
            // No length header: a constant bitrate file has the same header again one frame later.
            const next = await read(start + frameLength(mpeg, bitrateKbps, sampleRate, (frame[2] >> 1) & 1), FRAME_HEADER);
            const nextAfterPadding = await read(start + frameLength(mpeg, bitrateKbps, sampleRate, ((frame[2] >> 1) & 1) ^ 1), FRAME_HEADER);
            const isSame = (candidate: Buffer) => candidate[0] === 0xff && (candidate[1] & 0xfe) === versionByte && candidate[2] >> 4 === frame[2] >> 4;
            if (!isSame(next) && !isSame(nextAfterPadding)) throw notJoinable("variable bitrate");
        }
        let end = size;
        const tail = await read(size - ID3V1_SIZE, 3);
        if (size - ID3V1_SIZE > start && tail.toString("latin1") === "TAG") end -= ID3V1_SIZE;
        return { file, start, end, bitrateKbps, sampleRate, mono };
    } finally {
        await handle.close();
    }
};

const windowCache = new Map<string, { key: string; window: Promise<AudioWindow> }>();

/** Cached per file, and read again when the file has another size or modification time. */
const audioWindowOf = async (file: string): Promise<AudioWindow> => {
    const { size, mtimeMs } = await stat(file);
    const key = `${size}:${mtimeMs}`;
    const cached = windowCache.get(file);
    if (cached?.key === key) return cached.window;
    const window = readAudioWindow(file);
    windowCache.set(file, { key, window });
    // A refused file is not kept, so a fixed file is read again at once.
    window.catch(() => windowCache.delete(file));
    return window;
};

/** The one mp3 of the parts of a book, in the order of the files. Throws NotJoinableError when the parts are not all constant bitrate MPEG layer 3 (all MPEG-1 or all MPEG-2) with the same sample rate and channels. */
export const openBookStream = async (files: string[]): Promise<BookStream> => {
    const windows = await Promise.all(files.map(audioWindowOf));
    const [first] = windows;
    if (windows.some((window) => window.sampleRate !== first.sampleRate || window.mono !== first.mono)) {
        throw new NotJoinableError("the parts differ in sample rate or channels");
    }
    let sizeSum = 0;
    let secSum = 0;
    const startsSec = windows.map((window) => {
        const startSec = secSum;
        sizeSum += window.end - window.start;
        secSum += ((window.end - window.start) * 8) / (window.bitrateKbps * 1000);
        return startSec;
    });
    return { windows, size: sizeSum, startsSec, totalSec: secSum };
};

/** The bytes `first`..`last` (inclusive) of the stream. */
export const readBookStream = (stream: BookStream, first: number, last: number): Readable =>
    Readable.from(
        (async function* () {
            let offset = 0;
            for (const { file, start, end } of stream.windows) {
                const length = end - start;
                const from = Math.max(first - offset, 0);
                const to = Math.min(last - offset, length - 1);
                if (from <= to) {
                    yield* createReadStream(file, { start: start + from, end: start + to });
                }
                offset += length;
                if (offset > last) return;
            }
        })()
    );
