import { ErrorCodes } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { AppErrorV2 } from "../error/AppError";
import { parseByteRange } from "./byte-range";

/** Sends a file with range requests so it can be seeked. 404 when there is no file; `resource` names what is missing ("video"). */
export const sendRangedFile = async (
    req: FastifyRequest,
    reply: FastifyReply,
    file: string | undefined,
    contentType: string,
    resource: string
) => {
    const size = file
        ? await stat(file)
              .then((s) => s.size)
              .catch(() => undefined)
        : undefined;
    if (!file || size === undefined) {
        throw new AppErrorV2({ code: ErrorCodes.NOT_FOUND, message: `There is no such ${resource}`, params: { resource } });
    }
    reply.header("Content-Type", contentType);
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
