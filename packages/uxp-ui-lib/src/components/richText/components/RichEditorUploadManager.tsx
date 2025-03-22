import { Editor } from "@tiptap/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { UploadSource, UploadType, useRichEditorUI } from "../RichEditorContext";



type UploadConfig = {
    accept: string;
    capture?: string;
    handler: (file: File) => Promise<string | undefined>;
    command: (editor: Editor, url: string, options?: any) => void;
}

const checkCamera = async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        return false;
    }

    try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some((device) => device.kind === "videoinput");
    } catch (error) {
        console.error("Error checking camera availability:", error);
        return false;
    }
};

export function RichEditorUploadManager() {
    const inputRef = useRef<HTMLInputElement>(null);
    const [config, setConfig] = useState<UploadConfig | null>(null);

    const { editor, onImageUpload, registerUploadTrigger, setHasCamera } = useRichEditorUI();

    const uploadConfig: Record<UploadType, UploadConfig> = useMemo(() => ({
        image: {
            accept: "image/*",
            handler: onImageUpload,
            command: (editor, url) => editor?.chain().focus().setImage({ src: url }).run(),
        },
        video: {
            accept: "video/*",
            handler: onImageUpload,
            command: (editor, url) => editor?.chain().focus().setVideo({ src: url }).run(),
        },
        document: {
            accept: ".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt",
            handler: onImageUpload,
            command: (editor, url, fileName) => {
                const name = fileName ? fileName : decodeURIComponent(url.split("/").pop() || "").trim() || "Download file";
                editor?.commands.insertAttachment({ href: url, name });
            },
        },
    }), [onImageUpload]);

    useEffect(() => {
        checkCamera().then(setHasCamera);
    }, []);

    const triggerUpload = (uploadType: UploadType, source: UploadSource) => {
        if (!inputRef.current) return;

        const isCamera = source === "camera";

        const currentConfig: UploadConfig = {
            ...uploadConfig[uploadType],
            capture: isCamera ? "environment" : undefined,
        }
        setConfig(currentConfig);

        inputRef.current.accept = currentConfig.accept;
        if (currentConfig.capture) {
            inputRef.current.setAttribute("capture", currentConfig.capture);
        } else {
            inputRef.current.removeAttribute("capture");
        }

        inputRef.current.click();
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && config) {
            const url = await config.handler(file);
            if (editor && url) {
                config.command(editor, url, file.name);
            }
        }
        event.target.value = "";
    };

    // Register all triggers
    registerUploadTrigger({
        image: () => triggerUpload("image", "file"),
        video: () => triggerUpload("video", "file"),
        document: () => triggerUpload("document", "file"),
    });

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
            onChange={handleUpload}
        />
    );
}
