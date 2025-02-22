
import { GenericWebSocketMessage, GenericWebSocketResponse, MAGIC_BINARY_PREFIX } from "./ws.types";

export function createBinaryMessage(
    header: GenericWebSocketMessage | GenericWebSocketResponse,
    data: Uint8Array|Buffer
): Buffer {
    const bufArray = [];
    const magicBuffer = Buffer.from(MAGIC_BINARY_PREFIX, "utf-8");
    bufArray.push(magicBuffer);

    // Convert header to Buffer
    const headerBuffer = Buffer.from(JSON.stringify(header), "utf-8");
    // Prefix header length (4-byte big-endian integer)
    const headerLengthBuffer = Buffer.alloc(4);
    headerLengthBuffer.writeUInt32BE(headerBuffer.length, 0);

    const dataBuffer=Buffer.isBuffer(data) ? data : Buffer.from(data)
    bufArray.push(headerLengthBuffer, headerBuffer, dataBuffer);
    // Combine: MAGIC_BINARY_PREFIX + [4-byte header length] + [header JSON] + [binary data]
    return Buffer.concat(bufArray);
}

