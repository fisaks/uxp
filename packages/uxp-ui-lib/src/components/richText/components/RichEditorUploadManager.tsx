import { Editor } from "@tiptap/core";
import { useEffect, useRef } from "react";
import { useUxpDeviceId } from "../../../hooks/useUxpDeviceId";
import { UploadSource, UploadType, useRichEditorUI } from "../RichEditorContext";
import { findNodeByType } from "../extensions/extensionUtil";

//Metadata of the upload passed to the insert command
type UploadMeta = {
    localFileName: string;
    serverFileName: string;
    mimetype: string;
}
// Tiptap command to do when per media type inserting the new upload in the document 
type UploadCommandConfig = {
    accept: string;
    command: (editor: Editor, id: string, url: string, options?: UploadMeta) => void;
}

// Checks if camera is available for file uploads from camera
const checkCamera = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        return false;
    }

    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some((device) => device.kind === "videoinput");
    } catch (error) {
        console.error("[RichEditorUploadManager] Error checking camera availability:", error);
        return false;
    }
};

const UPLOAD_COMMAND_CONFIG: Record<UploadType, UploadCommandConfig> = {
    image: {
        accept: "image/*",
        command: (editor, id, url) => editor?.chain().focus().insertImageAtPlaceholder(id, { src: url }).run(),
    },
    video: {
        accept: "video/*",
        command: (editor, id, url) => editor?.chain().focus().insertVideoAtPlaceholder(id, { src: url }).run(),
    },
    document: {
        accept: ".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt",
        command: (editor, id, url, options) => {
            const name = options?.localFileName ? options.localFileName : (options?.serverFileName ?? decodeURIComponent(url.split("/").pop() || "").trim() ?? "Download file");
            editor?.commands.insertAttachmentAtPlaceholder(id, { url: url, name, mimetype: options?.mimetype });
        },
    },
};
// Infers UploadType from file MIME type
const getUploadType = ({ type }: { type: string }): UploadType => {
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    return "document";
}

// RichEditorUploadManager handles integration between file inputs and TipTap editor
// It listens for uploads, inserts placeholders, and reacts to status updates
export function RichEditorUploadManager() {
    const inputRef = useRef<HTMLInputElement>(null);
    const deviceId = useUxpDeviceId();
    const {
        editor,
        registerUploadTrigger,
        setHasCamera,
        registerFileDropHandler,
        registerRetryHandler,
        startUpload,
        retryUpload,
        subscribeToUploadStatus,
        getUploadStatus,
        yDoc
    } = useRichEditorUI();

    // Check if camera is available on mount

    useEffect(() => {
        checkCamera().then(setHasCamera);

    }, []);

    // Subscribes to upload status updates and updates TipTap placeholders
    useEffect(() => {
        const unsubscribe = subscribeToUploadStatus ? subscribeToUploadStatus((id, uploadStatus) => {
            console.info("[RichEditorUploadManager] Status message", id, uploadStatus);
            const { progress, speed, status } = uploadStatus;
            editor?.commands.updateUploadPlaceholder(id, { progress, speed, status });
        }) : undefined;

        return () => {
            console.info("[RichEditorUploadManager] Cleaning up upload manager");
            unsubscribe && unsubscribe();
        };
    }, [editor, subscribeToUploadStatus]);

    // Syncs upload status with TipTap on mount
    useEffect(() => {
        if (!editor || !getUploadStatus) return;

        let isMounted = true;

        const syncUploadStatus = async () => {
            await yDoc.whenLoaded;

            if (!isMounted) return;

            const placeholders = findNodeByType(editor.state, "uploadPlaceholder");
            console.info("[RichEditorUploadManager] yDoc loaded, syncing upload placeholder status", placeholders.length);

            for (const { id } of placeholders) {
                const status = getUploadStatus(id);

                if (!status) {
                    console.info("[RichEditorUploadManager] No status found, marking upload placeholder as canceled:", id);
                    editor.commands.updateUploadPlaceholder(id, { status: "canceled" });
                    continue;
                }
                console.info("[RichEditorUploadManager] Updating upload placeholder with latest status:", id, status);
                const { progress, speed, errorMessage } = status;
                editor.commands.updateUploadPlaceholder(id, {
                    progress,
                    speed,
                    status: status.status,
                    errorMessage,
                });

                if (status.status === "done" && status.publicId && status.fileName) {
                    console.info("[RichEditorUploadManager] Upload done, replacing placeholder:", id);
                    const config = UPLOAD_COMMAND_CONFIG[getUploadType(status.file)];
                    config.command(editor, id, status.publicId, {
                        localFileName: status.file.name,
                        serverFileName: status.fileName,
                        mimetype: status.file.type,
                    });
                }
            }
        };
        if (!yDoc.isLoaded) {
            syncUploadStatus();
        }

        return () => {
            isMounted = false;
        };

    }, [editor, getUploadStatus, yDoc]);
    // Triggers native file input for uploads of specific type (image, video, document)
    // This is registered to the context and called by child components
    const triggerUpload = (uploadType: UploadType, source: UploadSource) => {
        const input = inputRef.current;
        if (!input) return;

        const isCamera = source === "camera";
        const multiple = !isCamera;

        const config: UploadCommandConfig = UPLOAD_COMMAND_CONFIG[uploadType];

        input.accept = config.accept;
        input.multiple = multiple

        if (isCamera) {
            input.setAttribute("capture", "environment");
        } else {
            input.removeAttribute("capture");
        }

        input.click();
    };

    // Retry logic for previously failed or canceled uploads
    // This is registered to the context and called by child components
    const triggerRetry = async (id: string) => {
        const file = getUploadStatus?.(id)?.file;
        if (!editor || !retryUpload || !file) {
            console.warn("[RichEditorUploadManager] Retry failed: missing editor, retryUpload, or file.");
            return;
        }

        const config = UPLOAD_COMMAND_CONFIG[getUploadType(file)];

        try {
            const { promise } = retryUpload(id);

            const result = await promise;
            config.command(editor, id, result.publicId, {
                localFileName: file.name,
                serverFileName: result.fileName,
                mimetype: file.type,
            });

        } catch (err) {
            console.error(`[RichEditorUploadManager] Retry failed for ${file.name}:`, err);
        }
    }
    // Starts the upload for a selected or dropped file, inserts placeholder, and calls the command when done
    const startFileUpload = async (file: File, config: UploadCommandConfig) => {
        if (!editor) return;
        console.info("[RichEditorUploadManager] Starting upload for file:", file.name);
        try {
            const { id, promise } = startUpload(file);
            editor?.commands.insertUploadPlaceholder({
                id,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                status: 'uploading',
                progress: 0,
                speed: 0,
                uploaderName: "TODO: it was me", // TODO get user name
                deviceId,
            });

            const result = await promise;
            config.command(editor, id, result.publicId, {
                localFileName: file.name,
                serverFileName: result.fileName,
                mimetype: file.type,
            });

        } catch (err) {
            console.error(`[RichEditorUploadManager] Upload failed for ${file.name}:`, err);
        }
    };

    // Called when the file input changes (user selected files or took a photo)
    const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !editor) return;

        await Promise.allSettled(
            Array.from(files).filter(file => file).map(file => {
                return startFileUpload(file, UPLOAD_COMMAND_CONFIG[getUploadType(file)]);
            })
        );

        event.target.value = "";
    };
    // Handles drag-and-drop file uploads directly into the editor
    const handleFileDrop = (files: File[]) => {
        if (!editor) return;
        Promise.allSettled(
            files.map(file => startFileUpload(file, UPLOAD_COMMAND_CONFIG[getUploadType(file)]))
        );
    }

    // Register drop and retry handlers with editor context
    registerFileDropHandler(handleFileDrop);
    registerRetryHandler(triggerRetry);
    // Register triggers for file uploads (via buttons or UI actions)
    registerUploadTrigger({
        image: () => triggerUpload("image", "file"),
        video: () => triggerUpload("video", "file"),
        document: () => triggerUpload("document", "file"),
    });
    // Register triggers for camera uploads
    registerUploadTrigger(
        {
            image: () => triggerUpload("image", "camera"),
            video: () => triggerUpload("video", "camera"),
        },
        { source: "camera" }
    );

    return (
        <input
            type="file"
            ref={inputRef}
            style={{ display: "none" }}
            onChange={handleFileInputChange}
        />
    );
}
