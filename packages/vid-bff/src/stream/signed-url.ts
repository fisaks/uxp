import { Buffer } from "buffer";
import { createHmac, timingSafeEqual } from "crypto";

const LINK_LIFETIME_SECONDS = 12 * 60 * 60;
// Derived from the JWT secret, so a stream signature can never pass as anything else.
const key = createHmac("sha256", process.env.JWT_SECRET as string).update("vid-stream").digest();

const sign = (clipId: string, expires: number): string => createHmac("sha256", key).update(`${clipId}.${expires}`).digest("hex");

/** The query a stream URL needs to be accepted without the cookie. The Chromecast has no cookie. */
export const signStreamQuery = (clipId: string, now = Date.now()): { exp: number; sig: string } => {
    const exp = Math.floor(now / 1000) + LINK_LIFETIME_SECONDS;
    return { exp, sig: sign(clipId, exp) };
};

export const isValidStreamQuery = (clipId: string, exp: number, sig: string, now = Date.now()): boolean => {
    if (exp * 1000 < now) {
        return false;
    }
    const expected = Buffer.from(sign(clipId, exp), "hex");
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
};
