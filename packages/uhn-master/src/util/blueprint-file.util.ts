import { BlueprintFileTypes, UhnFileType } from "@uhn/common";
import { AppErrorV2, AppLogger, extractZip, fileExists, handleMultipartUpload, moveFile, pathExists, removeDir, removeFile, UploadedFile } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import fs, { ensureDir } from "fs-extra";
import path from "path";
import env from "../env";
import unzipper from 'unzipper';

const PreFlightFolder = path.join(env.UHN_FILE_UPLOAD_PATH, ".pre-flight");
const ActiveBlueprintFolder = path.join(env.UHN_WORKSPACE_PATH, "blueprint", "active");
const WorkBlueprintFolder = path.join(env.UHN_WORKSPACE_PATH, "blueprint", "work");



async function handleAndValidateUpload(request: FastifyRequest)
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

async function moveAndOrganizeUploadedBlueprint(
    srcZipPath: string,
    fileType: UhnFileType,
    identifier: string,
    version: number): Promise<{ blueprintFolder: string, blueprintZip: string }> {

    const blueprintFolder = path.join(env.UHN_FILE_UPLOAD_PATH, fileType, identifier, `v${version}`);
    const blueprintZip = path.join(blueprintFolder, `${identifier}-v${version}.zip`);
    await ensureDir(blueprintFolder);
    await moveFile(srcZipPath, blueprintZip);
    return { blueprintFolder, blueprintZip };
}

async function extractBlueprintToDir(
    zipPath: string,
    folder: string) {

    try {

        await extractZip(zipPath, folder);
    } catch (err) {
        AppLogger.error({
            message: `Failed to extract blueprint zip to folder: ${folder}`,
            error: err,
        });
        throw new AppErrorV2({
            statusCode: 500,
            code: "BLUEPRINT_ACTIVATION_FAILED",
            message: `Failed to extract blueprint zip to folder`,
        });
    }
}

async function deleteBlueprintZip(zipPath: string) {

    try {
        await removeFile(zipPath);
    } catch (err) {
        AppLogger.warn({
            message: `Failed to delete blueprint file at ${zipPath}`,
            error: err,
        });
    }
}

async function prepareBlueprintWorkdir(): Promise<string> {
    const dir = path.join(WorkBlueprintFolder, "src");
    await removeDir(dir).catch(() => { });
    await ensureDir(dir);
    return dir;
}

async function removeActiveBlueprint() {

    try {
        await removeDir(ActiveBlueprintFolder)
    } catch (err) {
        AppLogger.error({
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

async function getBlueprintStream(blueprintZipPath: string) {
    if (!(await pathExists(blueprintZipPath))) {
        throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `Blueprint file ${blueprintZipPath} not found on disk` });
    }
    return fs.createReadStream(blueprintZipPath)
}

async function extractFileFromZip(zipPath: string, filename: string): Promise<Buffer | undefined> {
    const directory = await unzipper.Open.file(zipPath);
    const entry = directory.files.find(f => f.path === filename);
    return entry?.buffer();
}
async function activeBlueprintExists(): Promise<boolean> {
    const blueprintJson = path.join(ActiveBlueprintFolder, "src", "blueprint.json")
    return await pathExists(ActiveBlueprintFolder) && await fileExists(blueprintJson);
}
async function writePrettyJson(filename: string, data: unknown) {
    const filePath = path.join(ActiveBlueprintFolder, filename);
    const json = JSON.stringify(data, null, 2); // 2-space indentation
    await fs.writeFile(filePath, json, "utf8");
}

async function swapActiveBlueprint() {
    const backup = `${ActiveBlueprintFolder}.old`;

    // cleanup old backup if exists
    await removeDir(backup).catch(() => { });

    // move active → backup
    if (await pathExists(ActiveBlueprintFolder)) {
        await fs.rename(ActiveBlueprintFolder, backup);
    }

    // move work → active
    await fs.rename(WorkBlueprintFolder, ActiveBlueprintFolder);

}


export const BlueprintFileUtil = {
    ActiveBlueprintFolder,
    WorkBlueprintFolder,
    handleAndValidateUpload,
    moveAndOrganizeUploadedBlueprint,
    extractBlueprintToDir,
    deleteBlueprintZip,
    removeActiveBlueprint,
    getBlueprintStream,
    extractFileFromZip,
    activeBlueprintExists,
    writePrettyJson,
    prepareBlueprintWorkdir,
    swapActiveBlueprint,
};