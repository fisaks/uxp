import { Buffer } from "buffer";
import { createHmac, timingSafeEqual } from "crypto";

const LINK_LIFETIME_SECONDS = 12 * 60 * 60;

export type StreamSigner = {
    /** The query a stream URL needs to be accepted without the cookie. */
    sign: (id: string, now?: number) => { exp: number; sig: string };
    isValid: (id: string, exp: number, sig: string, now?: number) => boolean;
};

/**
 * Signs short-lived stream links for something that cannot send the cookie or an Authorization header (an audio or
 * video element, a Chromecast). The key is derived from the JWT secret and the purpose, so a signature made for one
 * kind of stream can never pass as another kind, or as anything else.
 */
export const createStreamSigner = (purpose: string): StreamSigner => {
    let key: Buffer | undefined;
    // Derived on first use, so the environment is loaded by then.
    const sign = (id: string, exp: number): string => {
        key ??= createHmac("sha256", process.env.JWT_SECRET as string).update(purpose).digest();
        return createHmac("sha256", key).update(`${id}.${exp}`).digest("hex");
    };
    return {
        sign: (id, now = Date.now()) => {
            const exp = Math.floor(now / 1000) + LINK_LIFETIME_SECONDS;
            return { exp, sig: sign(id, exp) };
        },
        isValid: (id, exp, sig, now = Date.now()) => {
            if (exp * 1000 < now) {
                return false;
            }
            const expected = Buffer.from(sign(id, exp), "hex");
            const given = Buffer.from(sig, "hex");
            return given.length === expected.length && timingSafeEqual(given, expected);
        },
    };
};
