import { FileUploadResponse } from "@h2c/common";
import { UploadHandler } from "@uxp/ui-lib";
import axios from "axios";
import { getBaseUrl } from "../../config";
import { BlueprintUploadResponse } from "@uhn/common";

export const uploadBlueprint: UploadHandler<BlueprintUploadResponse> = (file, onProgress, signal) => {
    const formData = new FormData();

    formData.append("type", "blueprint");
    formData.append("file", file);



    const promise: Promise<BlueprintUploadResponse> = axios.post<BlueprintUploadResponse>(`${getBaseUrl()}/api/upload-blueprint`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (onProgress ? (e) => onProgress({ total: e.total, loaded: e.loaded }) : undefined),
        signal
    }).then(res => ({
        identifier: res.data.identifier,
        version: res.data.version
    }))
    return promise;
    


}