import { UPLOAD_CHUNK_BYTES } from "@vid/common";
import { AxiosUtil, ErrorCodes } from "@uxp/common";
import axios from "axios";
import { AppDispatch, RootState } from "../../app/store";
import { createUpload, deleteUpload, getUpload, listUploads, putChunk } from "./upload.api";
import { phaseSet, progressed, serverStateReceived, serverUploadsLoaded, sessionCreated } from "./uploadSlice";

type Thunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void>;

const RETRY_DELAYS_MS = [2000, 5000, 10000];
/** How many answers in a row may say the server has another offset: more means someone else writes to the same upload. */
const MAX_RESYNCS = 3;
/** How much of the start and the end of a file is read to tell the file again: 1 MB (1 048 576 bytes). */
const FINGERPRINT_BYTES = 1024 * 1024;

/** The files are not in the store, they cannot be serialized. */
const files = new Map<string, File>();
const aborts = new Map<string, AbortController>();
let running = false;

export const holdFile = (key: string, file: File) => files.set(key, file);
export const dropFile = (key: string) => files.delete(key);

/**
 * A break of the connection, a busy server or a server that is down (the proxy answers 5xx): the upload is paused and can be
 * resumed, the bytes that are there are kept.
 */
const isResumable = (error: unknown) => {
    const { code } = AxiosUtil.getErrorResponse(error).error;
    const status = axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;
    return code === ErrorCodes.DISCONNECTED || code === ErrorCodes.TIMEOUT || code === ErrorCodes.SYSTEM_BUSY || status >= 500;
};

const wait = (ms: number, signal: AbortSignal) =>
    new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                resolve();
            },
            { once: true }
        );
    });

/** sha1 of the first and the last megabyte, as 40 hex digits. Cheap to read from a file of gigabytes, and enough to tell the same file again. */
const fingerprintOf = async (file: File): Promise<string> => {
    const head = await file.slice(0, FINGERPRINT_BYTES).arrayBuffer();
    const tail = await file.slice(Math.max(0, file.size - FINGERPRINT_BYTES)).arrayBuffer();
    const bytes = new Uint8Array(head.byteLength + tail.byteLength);
    bytes.set(new Uint8Array(head));
    bytes.set(new Uint8Array(tail), head.byteLength);
    const digest = await crypto.subtle.digest("SHA-1", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const itemOf = (getState: () => RootState, key: string) => getState().upload.items.find((i) => i.key === key);

/** Sends the file from where the server has it. Returns when the last chunk is in, or the upload is paused or failed. */
const send = async (key: string, dispatch: AppDispatch, getState: () => RootState, signal: AbortSignal) => {
    const file = files.get(key);
    const item = itemOf(getState, key);
    if (!file || !item) return;
    let sessionId = item.sessionId;
    let offset = 0;
    if (sessionId) {
        offset = (await getUpload(sessionId)).offset;
    } else {
        // The server goes on with a stopped upload of the same file, so the offset can be more than 0.
        const session = await createUpload({
            sizeBytes: file.size,
            originalName: file.name,
            fingerprint: await fingerprintOf(file),
            ...(item.date ? { date: item.date } : {}),
        });
        sessionId = session.id;
        offset = session.offset;
        dispatch(sessionCreated({ key, sessionId, sent: offset }));
    }
    dispatch(progressed({ key, sent: offset }));
    let failures = 0;
    let resyncs = 0;
    while (offset < file.size) {
        try {
            const answer = await putChunk(sessionId, offset, file.slice(offset, offset + UPLOAD_CHUNK_BYTES), signal, (sent) =>
                dispatch(progressed({ key, sent }))
            );
            failures = 0;
            resyncs = 0;
            offset = answer.offset;
            dispatch(progressed({ key, sent: offset }));
            if (answer.complete) {
                // The push of the server can be here before this answer, and a quick copy can even be done: only an item still sending is taken on.
                if (itemOf(getState, key)?.phase === "uploading") {
                    dispatch(phaseSet({ key, phase: "processing" }));
                    dispatch(serverStateReceived(answer));
                }
                return;
            }
        } catch (error) {
            if (signal.aborted) return;
            const { code, params } = AxiosUtil.getErrorResponse(error).error;
            if (code === ErrorCodes.CONFLICT && typeof params?.offset === "number") {
                if (++resyncs > MAX_RESYNCS) throw error;
                offset = params.offset; // the server has more or less than we thought: go on from where it is
                continue;
            }
            if (!isResumable(error) || failures >= RETRY_DELAYS_MS.length) throw error;
            await wait(RETRY_DELAYS_MS[failures++], signal);
            if (signal.aborted) return;
            offset = (await getUpload(sessionId)).offset;
        }
    }
};

/** Sends the queued files one after the other, the phone has one connection to share. */
export const sendQueued: Thunk = async (dispatch, getState) => {
    if (running) return;
    running = true;
    try {
        for (let item = getState().upload.items.find((i) => i.phase === "queued"); item; ) {
            const { key } = item;
            const abort = new AbortController();
            aborts.set(key, abort);
            dispatch(phaseSet({ key, phase: "uploading" }));
            try {
                await send(key, dispatch, getState, abort.signal);
            } catch (error) {
                const { code } = AxiosUtil.getErrorResponse(error).error;
                dispatch(phaseSet({ key, phase: isResumable(error) ? "paused" : "failed", errorCode: code }));
            }
            aborts.delete(key);
            item = getState().upload.items.find((i) => i.phase === "queued");
        }
    } finally {
        running = false;
    }
};

/** Stops what is sent and takes the bytes on the server away. The file that is being made ready cannot be stopped. */
export const cancelUpload =
    (key: string): Thunk =>
    async (_dispatch, getState) => {
        aborts.get(key)?.abort();
        const sessionId = itemOf(getState, key)?.sessionId;
        if (sessionId) await deleteUpload(sessionId).catch(() => undefined);
    };

/** Takes in what the server has for the user: stopped uploads, files being made ready, failed ones. Run when the page opens. */
export const loadServerUploads: Thunk = async (dispatch) => {
    dispatch(serverUploadsLoaded(await listUploads()));
};
