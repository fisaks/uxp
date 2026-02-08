import { AppLogger, Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { ActivateBlueprintSchema, BlueprintVersionLogSchema, DeleteBlueprintVersionSchema, DownloadBlueprintSchema, ListActivationsForVersionSchema, ListActivationsSchema } from "@uhn/common";
import { BlueprintMapper } from "../mappers/blueprint.mapper";
import { blueprintService } from "../services/blueprint.service";
import { edgeIdentityService } from "../services/edge-identity.service";
import { verify } from "../util/ed25519";

function validateInternalDownloadRequest(req: FastifyRequest): boolean {
    const edgeId = req.headers["x-uhn-edge-id"];
    const signature = req.headers["x-uhn-edge-signature"];
    if (!edgeId || !signature) {
        AppLogger.error(req, { message: "Missing required headers for internal blueprint download", object: { edgeId, signature } });
        return false;
    }
    const publicKey = edgeIdentityService.getPublicKey(Array.isArray(edgeId) ? edgeId[0] : edgeId)
    if (!publicKey) {
        AppLogger.warn(req, { message: `Unknown edge ${edgeId} attempted to download active blueprint` });
        return false;
    }
    const verified = verify(Buffer.from("GET /api/internal/download/blueprint"), Buffer.from(Array.isArray(signature) ? signature[0] : signature, "base64"), publicKey)

    if (!verified) {
        AppLogger.error(req, { message: `Failed to verify signature for edge ${edgeId} when downloading active blueprint` });
    }
    return verified;
}
export class BlueprintController {
    private fastify: FastifyInstance;
    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("post", "/upload-blueprint", { authenticate: true, roles: ["admin"] })
    @UseQueryRunner({ transactional: true })
    async uploadBlueprint(req: FastifyRequest, _reply: FastifyReply) {

        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint upload initiated by ${user.username}` });

        return await blueprintService.uploadBlueprint(req);
    }

    @Route("post", "/blueprints/:identifier/:version/activate", { authenticate: true, roles: ["admin"], schema: ActivateBlueprintSchema })
    @UseQueryRunner({ transactional: true })
    async activateBlueprint(req: FastifyRequest, _reply: FastifyReply) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was activated by ${user.username}` });

        const result = await blueprintService.activateBlueprint(identifier, version, user.username);
        return BlueprintMapper.toBlueprintVersion(result);
    }

    @Route("post", "/blueprints/:identifier/:version/deactivate", { authenticate: true, roles: ["admin"], schema: ActivateBlueprintSchema })
    @UseQueryRunner({ transactional: true })
    async deactivateBlueprint(req: FastifyRequest, _reply: FastifyReply) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was deactivated by ${user.username}` });

        const result = await blueprintService.deactivateBlueprint(identifier, version, user.username);
        return BlueprintMapper.toBlueprintVersion(result);
    }

    @Route("delete", "/blueprints/:identifier/:version", { authenticate: true, roles: ["admin"], schema: DeleteBlueprintVersionSchema })
    @UseQueryRunner({ transactional: true })
    async deleteBlueprint(req: FastifyRequest, _reply: FastifyReply) {
        const { identifier, version } = req.params as { identifier: string, version: number };

        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was deleted by ${user.username}` });

        return await blueprintService.deleteBlueprint(identifier, version, user.username);
    }

    @Route("get", "/blueprints", { authenticate: true, roles: ["admin"] })
    @UseQueryRunner({ transactional: false })
    async listBlueprints(req: FastifyRequest, _reply: FastifyReply) {
        const groups = await blueprintService.listBlueprints();
        // Map to DTO structure
        return groups.map(group => ({
            identifier: group.identifier,
            name: group.name,
            versions: group.versions.map(BlueprintMapper.toBlueprintVersion)
        }));
    }

    @Route("get", "/blueprints/activations", { authenticate: true, roles: ["admin"], schema: ListActivationsSchema })
    @UseQueryRunner({ transactional: false })
    async getAllBlueprintActivations(req: FastifyRequest, _reply: FastifyReply) {
        const { limit } = req.query as { limit?: number };
        return await blueprintService.getActivationLogs(limit);
    }


    @Route("get", "/blueprints/:identifier/:version/activations", {
        authenticate: true, roles: ["admin"], schema: ListActivationsForVersionSchema
    })
    @UseQueryRunner({ transactional: false })
    async getBlueprintActivationLog(
        req: FastifyRequest,
        _reply: FastifyReply
    ) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        return await blueprintService.getActivationLogForVersion(identifier, version);
    }

    @Route("get", "/blueprints/:identifier/:version/log", {
        authenticate: true, roles: ["admin"], schema: BlueprintVersionLogSchema
    })
    @UseQueryRunner({ transactional: false })
    async getBlueprintLog(
        req: FastifyRequest,
        _reply: FastifyReply
    ) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        return await blueprintService.getLogForVersion(identifier, version);
    }


    @Route("get", "/blueprints/:identifier/:version/download", { authenticate: true, roles: ["admin"], schema: DownloadBlueprintSchema })
    @UseQueryRunner({ transactional: false })
    async downloadBlueprint(req: FastifyRequest, reply: FastifyReply) {
        const { identifier, version } = req.params as { identifier: string, version: number };
        const user = (req.user as Token)
        AppLogger.info(req, { message: `Blueprint ${identifier} v${version} was downloaded ${user.username}` });

        const { mimeType, name, stream } = await blueprintService.getBlueprintVersionStream(identifier, version);
        reply.header("Content-Type", mimeType);
        reply.header("Content-Disposition", `attachment; filename="${name}"`);
        stream.on('error', err => {
            reply.status(500).send({ error: "Failed to read blueprint file" });
        });
        return reply.send(stream);

    }


    @Route("get", "/internal/download/blueprint", { authenticate: false, validate: validateInternalDownloadRequest })
    @UseQueryRunner({ transactional: false })
    async downloadActiveBlueprint(req: FastifyRequest, reply: FastifyReply) {
        const blueprint = await blueprintService.getActiveSignedBlueprint();
        if (!blueprint) {
            return reply.status(404).send({ error: "No active blueprint found" });
        }

        reply.header("Content-Type", "application/zip");
        reply.header("Content-Disposition", `attachment; filename="blueprint.zip"`);
        reply.header("X-UHN-Blueprint-Signature", blueprint.signature);
        reply.header("X-UHN-Blueprint-SHA256", blueprint.hash);
        blueprint.stream.on('error', err => {
            reply.status(500).send({ error: "Failed to read blueprint file" });
        });
        return reply.send(blueprint.stream);
    }
}
