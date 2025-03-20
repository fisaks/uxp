import { useEffect, useRef } from "react";
import { useRichEditorUI } from "../RichEditorContext";

const checkCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
        return false
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
export function RichEditorCameraUpload() {
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const { onImageUpload, editor, registerCameraCapture, setHasCamera } = useRichEditorUI();

    useEffect(() => {
        checkCamera().then(setHasCamera);
    }, []);

    const triggerImageUpload = () => {
        cameraInputRef.current?.click();
    }

    const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const imageUrl = await onImageUpload(file);
            if (imageUrl) {
                editor?.chain().focus().setImage({ src: imageUrl }).run();
            }
        }
    };


    registerCameraCapture(triggerImageUpload);

    return <input type="file" ref={cameraInputRef} style={{ display: "none" }} accept="image/*" capture="environment" onChange={handleImageCapture} />;
}
