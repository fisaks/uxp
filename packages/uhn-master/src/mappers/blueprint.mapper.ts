
import { BlueprintActivationDetails, BlueprintVersion } from "@uhn/common";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";

function toBlueprintVersion(bp: BlueprintEntity): BlueprintVersion {
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

function toBlueprintActivationDetail(blueprint: BlueprintEntity, activation: BlueprintActivationEntity): BlueprintActivationDetails {
    return {
            identifier: blueprint.identifier,
            version: blueprint.version,
            activatedAt: activation.activatedAt.toISO()!,
            activatedBy: activation.activatedBy,
            deactivatedAt: activation.deactivatedAt?.toISO?.() ?? undefined,
            deactivatedBy: activation.deactivatedBy,

    } satisfies BlueprintActivationDetails
}

export const BlueprintMapper = {
    toBlueprintVersion,
    toBlueprintActivationDetail,
};
