
import { GenericWebSocketMessage, GenericWebSocketResponse, MAGIC_BINARY_PREFIX } from "./ws.types";

const HEADER_LENGTH_BYTES = 4;
export function createBinaryMessage(
    header: GenericWebSocketMessage | GenericWebSocketResponse,
    data: Uint8Array | Buffer | ArrayBuffer
): Uint8Array {

    const encoder = new TextEncoder();

    // Convert magic prefix
    const magicBuffer = encoder.encode(MAGIC_BINARY_PREFIX);

    // Convert header to bytes
    const headerBuffer = encoder.encode(JSON.stringify(header));

    // Create a 4-byte buffer for the header length
    const headerLengthBuffer = new Uint8Array(HEADER_LENGTH_BYTES);
    new DataView(headerLengthBuffer.buffer).setUint32(0, headerBuffer.byteLength, false);

    // Convert `data` to a compatible binary format
    let dataBuffer: Uint8Array;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(data)) {
        dataBuffer = new Uint8Array(data); // Convert Buffer → Uint8Array (for consistency)
    } else if (data instanceof ArrayBuffer) {
        dataBuffer = new Uint8Array(data); // Convert ArrayBuffer → Uint8Array
    } else {
        dataBuffer = data; // Already Uint8Array
    }

    // Merge all parts into a single `Uint8Array`
    const totalLength = magicBuffer.byteLength + HEADER_LENGTH_BYTES + headerBuffer.byteLength + dataBuffer.byteLength;
    const result = new Uint8Array(totalLength);

    // Copy all parts into the final buffer
    result.set(magicBuffer, 0);
    result.set(new Uint8Array(headerLengthBuffer), magicBuffer.byteLength);
    result.set(headerBuffer, magicBuffer.byteLength + HEADER_LENGTH_BYTES);
    result.set(dataBuffer, magicBuffer.byteLength + HEADER_LENGTH_BYTES + headerBuffer.byteLength);

    return result;
}

