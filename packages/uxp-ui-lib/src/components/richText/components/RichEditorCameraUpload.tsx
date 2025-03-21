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
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const { onImageUpload, editor, registerCameraCapture, setHasCamera } = useRichEditorUI();

    useEffect(() => {
        checkCamera().then(setHasCamera);
    }, []);

    const triggerImageUpload = () => {
        imageInputRef.current?.click();
    }
    const triggerVideoUpload = () => {
        videoInputRef.current?.click();
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
    const handleVideoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return;
        const file = event.target.files[0];
        const videoUrl = await onImageUpload(file);
        if (videoUrl) {
            editor?.chain().focus().setVideo({ src: videoUrl }).run();
        }
    };



    registerCameraCapture({ image: triggerImageUpload, video: triggerVideoUpload });

    return <>
        <input type="file" ref={imageInputRef} style={{ display: "none" }} accept="image/*" capture="environment" onChange={handleImageCapture} />
        <input ref={videoInputRef} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={handleVideoCapture} />
    </>

}
