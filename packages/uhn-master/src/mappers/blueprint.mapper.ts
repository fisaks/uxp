
import { BlueprintActivationDetails, BlueprintVersion, BlueprintVersionLog } from "@uhn/common";
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
        errorSummary: bp.errorSummary ?? undefined,
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

function toBlueprintVersionLog(blueprint: BlueprintEntity): BlueprintVersionLog {
    return {
        identifier: blueprint.identifier,
        version: blueprint.version,
        status: blueprint.status,
        validationLog: blueprint.validationLog ?? undefined,
        compileLog: blueprint.compileLog ?? undefined,
        installLog: blueprint.installLog ?? undefined,
        errorSummary: blueprint.errorSummary ?? undefined,
    };
}

export const BlueprintMapper = {
    toBlueprintVersion,
    toBlueprintActivationDetail,
    toBlueprintVersionLog,
};
