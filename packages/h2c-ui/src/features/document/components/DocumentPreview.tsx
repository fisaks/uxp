import { AsyncContent, mapApiErrorsToMessageString, RichEditorPreview, useSafeState } from "@uxp/ui-lib";


import { useEffect, useMemo } from "react";
import { getBaseUrl } from "../../../config";
import { DocumentMetaData, getDocument } from "../document.api";

type DocumentPreviewProps = {
    documentId: string;
    version: string;
    onDocumentLoaded?: (document: DocumentMetaData) => void;
}
export const DocumentPreview = ({ documentId, version, onDocumentLoaded }: DocumentPreviewProps) => {

    const [document, setDocument] = useSafeState<DocumentMetaData | undefined>(undefined)
    const imageBasePath = useMemo(() => `${getBaseUrl()}/api/file`, []);
    const [loading, setLoading] = useSafeState(true);
    const [error, setError] = useSafeState<string | undefined>(undefined);

    const loadDocument = () => {
        setLoading(true);
        getDocument(documentId as string, version as string).then((d) => {
            setDocument(d)
            onDocumentLoaded?.(d);
        }).catch((e) => {
            console.error(e);
            setError(mapApiErrorsToMessageString(error, { NOT_FOUND: "Document not found" }));

        }).finally(() => {
            setLoading(false);
        })
    }

    useEffect(() => {
        loadDocument();
    }, [documentId, version])

    return (<AsyncContent
        loading={loading} props={{ loading: { fullHeight: true } }}
        error={error}
        noContent={!document?.data ? "No Document loaded" : undefined}
        onRetry={loadDocument}
    >
        <RichEditorPreview docId={documentId as string} version={parseInt(version as string)}
            content={document?.data!} imageBasePath={imageBasePath} title={document?.name} createdAt={document?.createdAt} />
    </AsyncContent>)
}