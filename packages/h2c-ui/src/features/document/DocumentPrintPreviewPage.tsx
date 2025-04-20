import { PrintPreview, useSafeState } from "@uxp/ui-lib";
import { useParams } from "react-router-dom";
import { DocumentPreview } from "./components/DocumentPreview";
import { DocumentMetaData } from "./document.api";

export const DocumentPrintPreviewPage = () => {
    const { documentId, version } = useParams()
    const [document, setDocument] = useSafeState<DocumentMetaData | undefined>(undefined)

    const onDocumentLoaded = (doc: DocumentMetaData) => {
        setDocument(doc);
    }

    return (
        <PrintPreview title={document?.name ?? ""} meta={{ createdAt: document?.createdAt, version: document?.version, docId: document?.documentId }}
            defaultSetting={{ showName: true, showMeta: true, includeHeader: true, orientation: "portrait" }} >
            <DocumentPreview documentId={documentId as string} version={version as string} onDocumentLoaded={onDocumentLoaded} />
        </PrintPreview>)
}