import { UPLOAD_CHUNK_BYTES } from "@vid/common";
import { AxiosUtil, ErrorCodes } from "@uxp/common";
import axios from "axios";
import { AppDispatch, RootState } from "../../app/store";
import { createUpload, deleteUpload, getUpload, putChunk } from "./upload.api";
import { phaseSet, progressed, sessionCreated } from "./uploadSlice";

type Thunk = (dispatch: AppDispatch, getState: () => RootState) => Promise<void>;

const RETRY_DELAYS_MS = [2000, 5000, 10000];

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
        const session = await createUpload({ sizeBytes: file.size, originalName: file.name, ...(item.date ? { date: item.date } : {}) });
        sessionId = session.id;
        dispatch(sessionCreated({ key, sessionId }));
    }
    dispatch(progressed({ key, sent: offset }));
    let failures = 0;
    while (offset < file.size) {
        try {
            const answer = await putChunk(sessionId, offset, file.slice(offset, offset + UPLOAD_CHUNK_BYTES), signal, (sent) =>
                dispatch(progressed({ key, sent }))
            );
            failures = 0;
            offset = answer.offset;
            dispatch(progressed({ key, sent: offset }));
            if (answer.state === "processing") {
                dispatch(phaseSet({ key, phase: "processing" }));
                return;
            }
        } catch (error) {
            if (signal.aborted) return;
            const { code, params } = AxiosUtil.getErrorResponse(error).error;
            if (code === ErrorCodes.CONFLICT && typeof params?.offset === "number") {
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
