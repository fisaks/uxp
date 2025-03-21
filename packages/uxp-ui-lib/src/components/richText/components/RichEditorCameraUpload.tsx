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

    const triggerImageCapture = () => {
        imageInputRef.current?.click();
    }
    const triggerVideoCapture = () => {
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



    registerCameraCapture({ image: triggerImageCapture, video: triggerVideoCapture });

    return <>
        <input type="file" ref={imageInputRef} style={{ display: "none" }} accept="image/*" capture="environment" onChange={handleImageCapture} />
        <input type="file" ref={videoInputRef} style={{ display: "none" }} accept="video/*" capture="environment" onChange={handleVideoCapture} />
    </>

}
