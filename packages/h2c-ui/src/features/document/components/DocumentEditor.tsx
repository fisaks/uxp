
import { RichTextEditor, useUploadTracker } from "@uxp/ui-lib";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from "react";
import { useDispatch } from "react-redux";
import * as Y from "yjs";
import { H2CAppErrorHandler, H2CAppWebSocketResponseListener, useH2CWebSocket } from "../../../app/H2CAppBrowserWebSocketManager";
import { AppDispatch } from "../../../app/store";
import { getBaseUrl } from "../../../config";

import { H2CAppResponseMessage } from "@h2c/common";


export interface DocumentEditorRef {
    save: () => Promise<H2CAppResponseMessage<"document:saved">>;

}

type DocumentEditorProps = {
    documentId: string;
    editable?: boolean
}

export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({ documentId, editable }, ref) => {

    const yDoc = useMemo(() => new Y.Doc(), []);
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
            }

        } as H2CAppWebSocketResponseListener
    }, [])


    const errorHandler: H2CAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        console.error("[DocumentEditor] Error", action, error, errorDetails);
        return false;
    }) as H2CAppErrorHandler, [])

    const { sendBinaryMessage, sendMessage, sendMessageAsync } = useH2CWebSocket(listeners, errorHandler);

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
        editable={editable}
        {...uploadTracker}
    />

});