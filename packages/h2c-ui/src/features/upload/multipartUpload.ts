import { FileUploadResponse } from "@h2c/common";
import { UploadHandler, UploadResult } from "@uxp/ui-lib";
import axios from "axios";
import { getBaseUrl } from "../../config";

export const uploadAttachment: UploadHandler = (file, onProgress, signal) => {
    const formData = new FormData();

    formData.append("type", "attachment");
    formData.append("file", file);



    const promise: Promise<UploadResult> = axios.post<FileUploadResponse>(`${getBaseUrl()}/api/file`, formData, {
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