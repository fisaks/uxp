
import { RichTextEditor, useCollaborativeDoc, useUploadTracker, YDocVersionDetail } from "@uxp/ui-lib";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import * as Y from "yjs";
import { H2CAppErrorHandler, H2CAppWebSocketResponseListener, useH2CWebSocket } from "../../../app/H2CAppBrowserWebSocketManager";
import { getBaseUrl } from "../../../config";

import { H2CAppResponseMessage } from "@h2c/common";
import { applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";


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
        return false;
    }) as H2CAppErrorHandler, [])

    const { sendBinaryMessage, sendMessage, sendMessageAsync } = useH2CWebSocket(listeners, errorHandler);
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
        return { createdAt, versionId, newVersion: versionCreated } as YDocVersionDetail;

    }, [documentId, sendMessageAsync]);

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


    useEffect(() => {
        sendMessage("document:subscribe", { documentId })
        return () => {
            sendMessage("document:unsubscribe", { documentId })
        }
    }, [documentId]);

    return <RichTextEditor
        label={label ?? "Edit Document"}
        imageBasePath={imageBasePath}
        yDoc={yDoc}
        awareness={awareness}
        editable={editable}
        notice={editorNotice}
        onSaveVersion={onSaveVersion}
        {...uploadTracker}
    />

});