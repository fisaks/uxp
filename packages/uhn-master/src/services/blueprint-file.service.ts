import { BlueprintFileTypes, UhnFileType } from "@uhn/common";
import { AppErrorV2, AppLogger, extractZip, handleMultipartUpload, moveFile, removeFile, RequestMetaData, UploadedFile } from "@uxp/bff-common";
import Ajv from 'ajv';
import { FastifyRequest } from "fastify";
import { ensureDir } from "fs-extra";
import path from "path";
import env from "../env";

const PreFlightFolder = path.join(env.UHN_FILE_UPLOAD_PATH, ".pre-flight");
const ActiveBlueprintFolder = path.join(env.UHN_WORKSPACE_PATH, "blueprint");

const ajv = new Ajv({
    allErrors: true,
    strict: false,
});

export class BlueprintFileService {

    constructor(private requestMeta: FastifyRequest | RequestMetaData) { }

    async handleAndValidateUpload(request: FastifyRequest)
        : Promise<{ zipPath: string, fileType: UhnFileType, file: UploadedFile }> {

        const files = await handleMultipartUpload<UhnFileType>(request, PreFlightFolder, BlueprintFileTypes);

        if (files.files.length === 0) {
            throw new AppErrorV2({ statusCode: 400, code: "NO_FILES_UPLOADED", message: "No blueprint files uploaded" });
        }
        if (files.files.length > 1) {
            throw new AppErrorV2({ statusCode: 400, code: "ONLY_SINGLE_FILE_ALLOWED", message: "Multiple blueprint files uploaded, only one is allowed" });
        }

        const file = files.files[0];
        if (file.mimetype !== "application/zip") {
            throw new AppErrorV2({ statusCode: 400, code: "INVALID_FILE_TYPE", message: "Invalid blueprint file type, only zip files are allowed" });
        }
        return {
            zipPath: path.join(PreFlightFolder, file.filename),
            fileType: files.fileType,
            file,
        };
    }

    async moveAndOrganizeUploadedBlueprint(
        srcZipPath: string,
        fileType: UhnFileType,
        identifier: string,
        version: number,

    ): Promise<{ blueprintFolder: string, blueprintZip: string }> {
        const blueprintFolder = path.join(env.UHN_FILE_UPLOAD_PATH, fileType, identifier, `v${version}`);
        const blueprintZip = path.join(blueprintFolder, `${identifier}-v${version}.zip`);
        await ensureDir(blueprintFolder);
        await moveFile(srcZipPath, blueprintZip);
        return { blueprintFolder, blueprintZip };
    }

    async extractBlueprintZipToActive(
        zipPath: string,
        activeBlueprintFolder: string
    ) {
        try {
            await removeFile(activeBlueprintFolder);
            // Extract new active
            await extractZip(zipPath, activeBlueprintFolder);
        } catch (err) {
            AppLogger.error(this.requestMeta, {
                message: `Failed to extract blueprint zip to active folder:`,
                error: err,
            });
            throw new AppErrorV2({
                statusCode: 500,
                code: "BLUEPRINT_ACTIVATION_FAILED",
                message: `Failed to extract blueprint zip to active folder`,
            });
        }
    }

    async deleteBlueprintZip(zipPath: string) {
        try {
            await removeFile(zipPath);
        } catch (err) {
            AppLogger.warn(this.requestMeta, {
                message: `Failed to delete blueprint file at ${zipPath}`,
                error: err,
            });
        }
    }

    async removeActiveBlueprint() {
        try {

            await removeFile(ActiveBlueprintFolder)
        } catch (err) {
            AppLogger.error(this.requestMeta, {
                message: `Failed to remove active blueprint folder`,
                error: err,
            });
            throw new AppErrorV2({
                statusCode: 500,
                code: "BLUEPRINT_DEACTIVATION_FAILED",
                message: `Failed to remove active blueprint folder`,
            });
        }
    }
    async activateBlueprint(toActivateZipPath: string) {

        this.removeActiveBlueprint();
        try {
            await extractZip(toActivateZipPath, ActiveBlueprintFolder);
        } catch (err) {
            AppLogger.error(this.requestMeta, {
                message: `Failed to extract blueprint zip during activation:`,
                error: err,
            });
            throw new AppErrorV2({
                statusCode: 500,
                code: "BLUEPRINT_ACTIVATION_FAILED",
                message: `Failed to extract blueprint zip during activation`,
            });
        }
    }
}