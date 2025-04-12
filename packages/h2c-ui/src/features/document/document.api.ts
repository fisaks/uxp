import axios from "axios";

import { DocumentVersions } from "@h2c/common";
import { AxiosUtil } from "@uxp/common";
import { getBaseUrl } from "../../config";


export type DocumentMetaData = {
    data: Uint8Array,
    name?: string,
    deleted: boolean,
    createdAt: string,
    removedAt?: string,
    version: string,
    documentId: string,
}
export const getDocument = async (documentId: string, version: string) => {
    try {
        const response = await axios.get(`${getBaseUrl()}/api/documents/${documentId}/versions/${version}`,
            { responseType: 'arraybuffer' });

        return {
            data: new Uint8Array(response.data),
            name: response.headers["x-document-name"],
            deleted: response.headers["x-document-deleted"] === "true",
            createdAt: response.headers["x-document-createdat"],
            removedAt: response.headers["x-document-removedat"],
            version: response.headers["x-document-version"] ?? version,
            documentId: response.headers["x-document-id"] ?? documentId,
        } as DocumentMetaData
    } catch (e: unknown) {
        if (AxiosUtil.isAxiosError(e) && e.response?.data instanceof ArrayBuffer) {
            const text = new TextDecoder().decode(e.response.data);
            const json = JSON.parse(text);
            throw json;
        }
        throw e;
    }
}

export const getVersions = async (documentId: string): Promise<DocumentVersions> => {
    try {
        const response = await axios.get<DocumentVersions>(`${getBaseUrl()}/api/documents/${documentId}/versions`);
        return response.data;
    } catch (e: unknown) {
        const error = AxiosUtil.getErrorResponse(e);
        throw error;
    }

}

export const restoreDocumentVersion = async (documentId: string, version: string) => {
    try {
        const response = await axios.post<{ version: number }>(`${getBaseUrl()}/api/documents/${documentId}/versions/${version}/restore`);
        return response.data;
    } catch (e: unknown) {
        const error = AxiosUtil.getErrorResponse(e);
        throw error;
    }
}

