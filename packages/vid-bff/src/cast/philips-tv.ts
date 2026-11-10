import axios, { AxiosRequestConfig } from "axios";
import { createHash, createHmac, randomBytes } from "crypto";
import https from "https";

const PORT = 1926;
const TIMEOUT_MS = 4000;
// The key that every JointSpace client signs the PIN with, published by Philips' own apps and the open clients.
const PAIRING_SECRET = "ZmVay1EQVFOaZhwQ4Kv81ypLAZNczV9sG4KkseXWn1NEk6cXmPKO/MCa9sryslvLCFMnNe4Z4CPXzToowvhHvA==";
const APP_NAME = "VID";

export type TvCredentials = { user: string; key: string };
/** A pairing that waits for the PIN that the TV shows. */
export type PendingPairing = { user: string; key: string; timestamp: number };

// The TV has a self-signed certificate. This agent is used for the TV only. It keeps one connection open and sends one request at a
// time: the TV's service stops answering (until the TV is powered off and on) after Node's default of a new connection per request,
// which curl does not trigger. Found by testing: headers, TLS version and the digest were ruled out.
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true, maxSockets: 1 });

const deviceBlock = (user: string) => ({
    device_name: "heliotrope",
    device_os: "Android",
    app_name: APP_NAME,
    type: "native",
    app_id: "app.id",
    id: user,
});

const base = (host: string) => `https://${host}:${PORT}/6`;

const md5 = (text: string) => createHash("md5").update(text).digest("hex");

/** An HTTP digest GET/POST: the first answer is a 401 that carries the challenge. */
const digestRequest = async <T>(host: string, path: string, credentials: TvCredentials, config: AxiosRequestConfig = {}): Promise<T> => {
    const url = `${base(host)}${path}`;
    const options: AxiosRequestConfig = { httpsAgent: agent, timeout: TIMEOUT_MS, validateStatus: () => true, ...config, url };
    const challenge = await axios.request(options);
    if (challenge.status !== 401) {
        if (challenge.status >= 400) throw new Error(`The TV answered HTTP ${challenge.status}`);
        return challenge.data as T;
    }
    const header = String(challenge.headers["www-authenticate"] ?? "");
    const field = (name: string) => new RegExp(`${name}="?([^",]+)"?`, "i").exec(header)?.[1];
    const realm = field("realm");
    const nonce = field("nonce");
    if (!realm || !nonce) throw new Error("The TV gave no digest challenge");
    const uri = `/6${path}`;
    const nc = "00000001";
    const cnonce = randomBytes(8).toString("hex");
    const ha1 = md5(`${credentials.user}:${realm}:${credentials.key}`);
    const ha2 = md5(`${(config.method ?? "GET").toUpperCase()}:${uri}`);
    const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:auth:${ha2}`);
    const authorization =
        `Digest username="${credentials.user}", realm="${realm}", nonce="${nonce}", uri="${uri}", ` +
        `qop=auth, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
    const answer = await axios.request({ ...options, headers: { ...config.headers, Authorization: authorization } });
    if (answer.status >= 400) throw new Error(`The TV answered HTTP ${answer.status}`);
    return answer.data as T;
};

/** Whether the device answers like a Philips TV with the JointSpace interface (the system call needs no pairing). */
export const isPhilipsTv = async (host: string): Promise<boolean> => {
    try {
        const { status } = await axios.get(`${base(host)}/system`, { httpsAgent: agent, timeout: TIMEOUT_MS });
        return status === 200;
    } catch {
        return false;
    }
};

/** Makes the TV show a PIN. */
export const requestPairing = async (host: string): Promise<PendingPairing> => {
    const user = randomBytes(8).toString("hex");
    const { data } = await axios.post<{ error_id?: string; auth_key?: string; timestamp?: number }>(
        `${base(host)}/pair/request`,
        { scope: ["read", "write", "control"], device: deviceBlock(user) },
        { httpsAgent: agent, timeout: TIMEOUT_MS }
    );
    if (data.error_id !== "SUCCESS" || !data.auth_key || data.timestamp === undefined) {
        throw new Error("The TV did not start the pairing");
    }
    return { user, key: data.auth_key, timestamp: data.timestamp };
};

/** Finishes the pairing with the PIN from the screen. Throws when the TV refuses it. */
export const grantPairing = async (host: string, pending: PendingPairing, pin: string): Promise<TvCredentials> => {
    const signature = createHmac("sha1", Buffer.from(PAIRING_SECRET, "base64")).update(`${pending.timestamp}${pin}`).digest("base64");
    const body = {
        auth: { auth_AppId: "1", pin, auth_timestamp: pending.timestamp, auth_signature: signature },
        device: deviceBlock(pending.user),
    };
    const credentials = { user: pending.user, key: pending.key };
    await digestRequest(host, "/pair/grant", credentials, { method: "POST", data: body });
    return credentials;
};

export const readPowerState = async (host: string, credentials: TvCredentials): Promise<"On" | "Standby" | undefined> => {
    const data = await digestRequest<{ powerstate?: string }>(host, "/powerstate", credentials);
    return data.powerstate === "On" || data.powerstate === "Standby" ? data.powerstate : undefined;
};

/** The package of the app that is in front, native apps included, which the Cast receiver does not tell. */
export const readActivity = async (host: string, credentials: TvCredentials): Promise<string | undefined> => {
    const data = await digestRequest<{ component?: { packageName?: string } }>(host, "/activities/current", credentials);
    return data.component?.packageName;
};

/** Switches the TV on or off. Throws when the TV does not take the call (a TV in deep standby may not answer at all). */
export const writePowerState = async (host: string, credentials: TvCredentials, state: "On" | "Standby"): Promise<void> => {
    await digestRequest(host, "/powerstate", credentials, { method: "POST", data: { powerstate: state } });
};
