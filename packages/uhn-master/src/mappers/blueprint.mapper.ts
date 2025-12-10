
import { BlueprintVersion } from "@uhn/common";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";

export class BlueprintMapper {

    static toBlueprintVersion(bp: BlueprintEntity): BlueprintVersion {
        return {
            identifier: bp.identifier,
            name: bp.name,
            version: bp.version,
            status: bp.status,
            active: bp.active,
            uploadedAt: bp.createdAt.toISO() ?? "",
            uploadedBy: bp.uploadedBy ?? "unknown",
            activatedAt: bp.lastActivatedAt?.toISO() ?? undefined,
            activatedBy: bp.lastActivatedBy ?? undefined,
            deactivatedAt: bp.lastDeactivatedAt?.toISO() ?? undefined,
            deactivatedBy: bp.lastDeactivatedBy ?? undefined,
            metadata: bp.metadata,
            compileLog: bp.compileLog ?? undefined,
            validationLog: bp.validationLog ?? undefined,
            downloadUrl: `/api/blueprints/${bp.identifier}/${bp.version}/download`
        };
    }
}
