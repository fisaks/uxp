import { FileUploadResponse } from "@h2c/common";
import { UploadHandler } from "@uxp/ui-lib";
import axios from "axios";
import { getBaseUrl } from "../../config";

export const uploadAttachment: UploadHandler<FileUploadResponse> = (file, onProgress, signal) => {
    const formData = new FormData();

    formData.append("type", "attachment");
    formData.append("file", file);



    const promise: Promise<FileUploadResponse> = axios.post<FileUploadResponse>(`${getBaseUrl()}/api/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (onProgress ? (e) => onProgress({ total: e.total, loaded: e.loaded }) : undefined),
        signal
    }).then(res => ({
        publicId: res.data.publicId,
        fileName: res.data.fileName
    }));;
    return promise;

    ;


}