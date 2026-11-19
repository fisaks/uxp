import { createStreamSigner } from "@uxp/bff-common";

const signer = createStreamSigner("vid-stream");

/** The query a stream URL needs to be accepted without the cookie. The Chromecast has no cookie. */
export const signStreamQuery = signer.sign;
export const isValidStreamQuery = signer.isValid;
