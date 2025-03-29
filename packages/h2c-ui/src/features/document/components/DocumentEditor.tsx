
import { RichTextEditor, selectCurrentUser, useCollaborativeDoc, useUploadTracker } from "@uxp/ui-lib";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from "react";
import * as Y from "yjs";
import { H2CAppErrorHandler, H2CAppWebSocketResponseListener, useH2CWebSocket } from "../../../app/H2CAppBrowserWebSocketManager";
import { getBaseUrl } from "../../../config";

import { H2CAppResponseMessage } from "@h2c/common";
import { useSelector } from "react-redux";
import { applyAwarenessUpdate, Awareness, encodeAwarenessUpdate } from "y-protocols/awareness";
import { useTheme } from "@mui/material";


export interface DocumentEditorRef {
    save: () => Promise<H2CAppResponseMessage<"document:saved">>;

}

type DocumentEditorProps = {
    documentId: string;
    editable?: boolean
}


export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({ documentId, editable }, ref) => {


    const {yDoc, awareness} =useCollaborativeDoc()

    const uploadTracker = useUploadTracker()
    const imageBasePath = useMemo(() => `${getBaseUrl()}/api/file`, []);

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

    useImperativeHandle(ref, () => ({
        save: async () => {
            console.info("[DocumentEditor] Saving document", documentId);
            const response = await sendMessageAsync("document:save", { documentId });
            return response as H2CAppResponseMessage<"document:saved">
        },

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
        label="Edit Document"
        imageBasePath={imageBasePath}
        yDoc={yDoc}
        awareness={awareness}
        editable={editable}
        {...uploadTracker}
    />

});