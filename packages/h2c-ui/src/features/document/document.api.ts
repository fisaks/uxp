import axios from "axios";

import { DocumentVersions } from "@h2c/common";
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

}

export const getVersions = async (documentId: string): Promise<DocumentVersions> => {
    const response = await axios.get<DocumentVersions>(`${getBaseUrl()}/api/documents/${documentId}/versions`);
    return response.data;
}
