import { ErrorDisplay, Loading, RichEditorPreview, useSafeState } from "@uxp/ui-lib";
import axios from "axios";

import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getBaseUrl } from "../../config";

type DocumentType = {
    data: Uint8Array,
    name?: string,
    deleted: boolean,
    createdAt: string,
    removedAt?: string,
}
const getDocument = async (documentId: string, version: string) => {
    const response = await axios.get(`${getBaseUrl()}/api/document/${documentId}/${version}`, { responseType: 'arraybuffer' });

    return {
        data: new Uint8Array(response.data),
        name: response.headers["x-document-name"],
        deleted: response.headers["x-document-deleted"] === "true",
        createdAt: response.headers["x-document-createdat"],
        removedAt: response.headers["x-document-removedat"],
    } as DocumentType

}
export const DocumentPreview = () => {
    const { documentId, version } = useParams()
    const [document, setDocument] = useSafeState<DocumentType | undefined>(undefined)
    const imageBasePath = useMemo(() => `${getBaseUrl()}/api/file`, []);
    const [loading, setLoading] = useSafeState(true);
    const [error, setError] = useSafeState(false);

    const loadDocument = () => {
        setLoading(true);
        getDocument(documentId as string, version as string).then((d) => {
            setDocument(d)
        }).catch((e) => {
            console.error(e);
            setError(true);
        }).finally(() => {
            setLoading(false);
        })
    }

    useEffect(() => {
        loadDocument();
    }, [documentId, version])


    if (loading) return <Loading fullHeight />

    if (error) return <ErrorDisplay message="An error occurred while loading the document" onRetry={loadDocument} />

    if (!document?.data) return <ErrorDisplay message="No Document loaded" onRetry={loadDocument} />

    return <RichEditorPreview docId={documentId as string} version={parseInt(version as string)}
        content={document.data} imageBasePath={imageBasePath} title={document?.name} createdAt={document.createdAt}/>

}