
import { RichTextEditor, useCollaborativeDoc, useUploadTracker, YDocVersionDetail } from "@uxp/ui-lib";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import * as Y from "yjs";
import { H2CAppErrorHandler, H2CAppWebSocketResponseListener, useH2CWebSocket, useH2CWebSocketSubscription } from "../../../app/H2CAppBrowserWebSocketManager";
import { getBaseRoutePath, getBaseUrl } from "../../../config";

import { H2CAppResponseMessage } from "@h2c/common";
import { buildPath } from "@uxp/common";
import { applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { getDocument, getVersions } from "../document.api";


export interface DocumentEditorRef {
    save: () => Promise<YDocVersionDetail>;

}

type DocumentEditorProps = {
    documentId: string;
    editable?: boolean
    label?: string
}


export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({ documentId, editable, label }, ref) => {


    const { yDoc, awareness } = useCollaborativeDoc()

    const uploadTracker = useUploadTracker()
    const imageBasePath = useMemo(() => `${getBaseUrl()}/api/file`, []);
    const [editorNotice, setEditorNotice] = useState<string | undefined>();
    const listeners = useMemo(() => {
        return {
            "document:full": (message, data) => {
                console.info("[DocumentEditor] Received document:full", message);
                if (message.payload?.documentId === documentId && data) {
                    Y.applyUpdate(yDoc, data, "server")
                    yDoc.emit("load", [yDoc]);
                }

            },
            "document:updated": (message, data) => {
                console.info("[DocumentEditor] Received document:updated", message);
                if (message.payload?.documentId === documentId && data) {
                    Y.applyUpdate(yDoc, data, "server");
                }
            },
            "document:awareness": (message, data) => {
                if (message.payload?.documentId === documentId && data) {
                    console.log("[DocumentEditor] Received awareness update");
                    applyAwarenessUpdate(awareness, data, "server");
                }
            },
            "document:deleted": (message) => {
                setEditorNotice("This document is deleted. Edits won’t be preserved unless it’s restored.")
            }

        } as H2CAppWebSocketResponseListener
    }, [])


    const errorHandler: H2CAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error("[DocumentEditor] Error", action, error, errorDetails);
        if (action.startsWith("document:")) {
            setEditorNotice("We are receiving errors from the server. Document updates may not be saved. Please try again later.");
        }
        return false;
    }) as H2CAppErrorHandler, [])

    const { sendBinaryMessage, sendMessageAsync } = useH2CWebSocket(listeners, errorHandler);
    useEffect(() => {
        const onAwarenessUpdate = (
            { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
            origin: any
        ) => {
            console.log("[useRichEditor] Awareness update", { added, updated, removed }, origin);

            const changedClients = [...added, ...updated, ...removed];
            const update = encodeAwarenessUpdate(awareness, changedClients);
            sendBinaryMessage("document:awareness", { documentId }, update);
        };

        awareness.on("update", onAwarenessUpdate);
        return () => awareness.off("update", onAwarenessUpdate);
    }, [awareness, documentId, sendBinaryMessage]);

    const onSaveVersion = useCallback(async () => {
        console.info("[DocumentEditor] Saving version", documentId);
        const response = await sendMessageAsync("document:save", { documentId }) as H2CAppResponseMessage<"document:saved">;
        const versionCreated = response.payload?.versionCreated;
        const versionId = response.payload?.versionId;
        const createdAt = response.payload?.createdAt;
        const docId = response.payload?.documentId;
        return { documentId: docId, createdAt, versionId: `${versionId}`, newVersion: versionCreated } as YDocVersionDetail;

    }, [documentId, sendMessageAsync]);

    const onPrintExport = useCallback(async (documentId: string, versionId: string) => {
        console.info("[DocumentEditor] Exporting document", documentId, versionId);


        const previewPath = buildPath(getBaseRoutePath() ?? "/", "document-preview", documentId, versionId);
        window.open(`${previewPath}?printView=true`, `doc-${documentId}-${versionId}`);
    }, []);

    const loadHistory = useCallback(async () => {
        return getVersions(documentId);
    }, [documentId]);

    const loadVersion = useCallback(async (version: string) => {
        return getDocument(documentId, version);
    }, [documentId]);

    const restoreVersion = useCallback(async (versionId: string) => {
        return;
    }, [documentId]);

    useImperativeHandle(ref, () => ({
        save: onSaveVersion,

    }));

    useEffect(() => {

        const updateHandler = (update: Uint8Array, origin: any, doc: Y.Doc) => {
            console.info("[DocumentEditor] Yjs update from", origin);
            if (origin === "server") return;

            sendBinaryMessage("document:update", { documentId }, update);
        }

        yDoc.on("update", updateHandler);

        return () => {
            yDoc.off("update", updateHandler);
        };

    }, []);

    useH2CWebSocketSubscription({
        action: "document:subscribe",
        payload: { documentId }
    });


    /*    useEffect(() => {
            sendMessage("document:subscribe", { documentId })
            return () => {
                sendMessage("document:unsubscribe", { documentId })
            }
        }, [documentId]);*/

    return <RichTextEditor
        label={label ?? "Edit Document"}
        imageBasePath={imageBasePath}
        yDoc={yDoc}
        awareness={awareness}
        editable={editable}
        notice={editorNotice}
        onSaveVersion={onSaveVersion}
        onPrintExport={onPrintExport}
        loadHistory={loadHistory}
        loadVersion={loadVersion}
        restoreVersion={restoreVersion}
        {...uploadTracker}
    />

});