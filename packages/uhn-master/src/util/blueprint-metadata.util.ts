import { BlueprintMetadata, BlueprintMetadataSchema } from "@uhn/common";
import { AppErrorV2 } from "@uxp/bff-common";
import Ajv from "ajv";
import { BlueprintFileUtil } from "./blueprint-file.util";


const ajv = new Ajv({
    allErrors: true,
    strict: false,
});

const validateBlueprintMetadataAjv = ajv.compile(BlueprintMetadataSchema);

function validateBlueprintMetadata(data: unknown): BlueprintMetadata {
    if (!validateBlueprintMetadataAjv(data)) {
        const errorText = ajv.errorsText(validateBlueprintMetadataAjv.errors, {
            separator: "; ",
        });

        throw new AppErrorV2({
            statusCode: 400,
            code: "BLUEPRINT_JSON_VALIDATION_FAILED",
            message: `Invalid blueprint metadata: ${errorText}`,
            params: { errors: errorText }
        });
    }

    return data as BlueprintMetadata;
}


async function readBlueprintMetadataFromZip(zipPath: string): Promise<BlueprintMetadata> {
    const content = await BlueprintFileUtil.extractFileFromZip(zipPath, 'blueprint.json');
    if (!content) {
        throw new AppErrorV2({
            statusCode: 400,
            code: "MISSING_BLUEPRINT_JSON",
            message: 'Missing blueprint.json in blueprint zip'
        });
    }

    let raw: unknown;
    try {
        raw = JSON.parse(content.toString("utf-8"));
    } catch (err) {
        throw new AppErrorV2({
            statusCode: 400,
            code: "BLUEPRINT_JSON_INVALID",
            message: "blueprint.json is not valid JSON",
        });
    }
    return validateBlueprintMetadata(raw);

}

export const BlueprintMetaDataUtil= {
    readBlueprintMetadataFromZip,
}
