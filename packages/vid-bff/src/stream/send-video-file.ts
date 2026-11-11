import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { parseByteRange } from "./byte-range";

/** Sends an MP4 file with range requests so it can be seeked. 404 when there is no file. */
export const sendVideoFile = async (req: FastifyRequest, reply: FastifyReply, file: string | undefined) => {
    const size = file
        ? await stat(file)
              .then((s) => s.size)
              .catch(() => undefined)
        : undefined;
    if (!file || size === undefined) {
        return reply.status(404).send({ error: "There is no such video" });
    }
    reply.header("Content-Type", "video/mp4");
    reply.header("Accept-Ranges", "bytes");
    reply.header("Cache-Control", "private, no-store");
    const range = parseByteRange(req.headers.range, size);
    if (range === "unsatisfiable") {
        return reply.status(416).header("Content-Range", `bytes */${size}`).send();
    }
    const stream = createReadStream(file, range);
    stream.on("error", () => reply.raw.destroy());
    if (!range) {
        return reply.header("Content-Length", size).send(stream);
    }
    return reply
        .status(206)
        .header("Content-Range", `bytes ${range.start}-${range.end}/${size}`)
        .header("Content-Length", range.end - range.start + 1)
        .send(stream);
};
