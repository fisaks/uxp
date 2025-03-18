
import { RichTextEditor } from "@uxp/ui-lib";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import * as Y from "yjs";
import { H2CAppErrorHandler, H2CAppWebSocketResponseListener, useH2CWebSocket } from "../../../app/H2CAppBrowserWebSocketManager";
import { AppDispatch } from "../../../app/store";
import { getBaseUrl } from "../../../config";
import { uploadFile } from "../../house/houseThunks";

import { H2CAppResponseMessage } from "@h2c/common";

export interface DocumentEditorRef {
    save: () => Promise<H2CAppResponseMessage<"document:saved">>;

}

type DocumentEditorProps = {
    documentId: string;
    editable?: boolean
}

export const DocumentEditor = forwardRef<DocumentEditorRef, DocumentEditorProps>(({ documentId, editable }, ref) => {



    const dispatch: AppDispatch = useDispatch();
    const subscribed = useRef<boolean>(false);
    const yDoc = useMemo(() => new Y.Doc(), []);

    const imageBasePath = useMemo(() => `${getBaseUrl()}/api/file`, []);

    const listeners = useMemo(() => {
        return {
            "document:full": (message, data) => {
                console.log("Received document:full", message);
                if (message.payload?.documentId === documentId && data) {
                    subscribed.current = false;

                    Y.applyUpdate(yDoc, data, "server")
                    //console.log("Received document:full dom 2", yDoc.getXmlFragment("default").toArray().map(node => node.toString()).join(""));
                    subscribed.current = true;

                }

            },
            "document:updated": (message, data) => {
                console.log("Received document:updated", message);
                if (message.payload?.documentId === documentId && data) {
                    Y.applyUpdate(yDoc, data, "server");
                }
            }

        } as H2CAppWebSocketResponseListener
    }, [])


    const errorHandler: H2CAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        return false;
    }) as H2CAppErrorHandler, [])

    const { sendBinaryMessage, sendMessage, sendMessageAsync } = useH2CWebSocket(listeners, errorHandler);

    useImperativeHandle(ref, () => ({
        save: async () => {
            const response = await sendMessageAsync("document:save", { documentId });
            return response as H2CAppResponseMessage<"document:saved">
        },

    }));

    const handleUploadFile = useCallback((file: File) => {
        return dispatch(uploadFile({ file }))
            .unwrap()
            .then((r) => r.publicId);
    }, []);
    useEffect(() => {

        const updateHandler = (update: Uint8Array, origin: any, doc: Y.Doc) => {
            if (origin === "server" || !subscribed.current) return;

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

    return subscribed && <RichTextEditor
        label="Edit Document"
        imageBasePath={imageBasePath}
        yDoc={yDoc}
        editable={editable}
        onImageUpload={handleUploadFile}
    />

});