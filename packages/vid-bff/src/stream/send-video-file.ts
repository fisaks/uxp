import { sendRangedFile } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";

/** Sends an MP4 file with range requests so it can be seeked. 404 when there is no file. */
export const sendVideoFile = (req: FastifyRequest, reply: FastifyReply, file: string | undefined) =>
    sendRangedFile(req, reply, file, "video/mp4", "video");
