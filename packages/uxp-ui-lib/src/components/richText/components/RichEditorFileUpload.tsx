import { useRef } from "react";
import { useRichEditorUI } from "../RichEditorContext";

export function RichEditorFileUpload() {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);


    const { onImageUpload, editor, registerImageUpload } = useRichEditorUI();

    const triggerImageUpload = () => {
        imageInputRef.current?.click();
    }
    const triggerVideoUpload = () => {
        videoInputRef.current?.click();
    }


    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const imageUrl = await onImageUpload(file);
            if (imageUrl) {
                editor?.chain().focus().setImage({ src: imageUrl }).run();
            }
        }
    };
    const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return;
        const file = event.target.files[0];
        const videoUrl = await onImageUpload(file);
        if (videoUrl) {
            editor?.chain().focus().setVideo({ src: videoUrl }).run();
        }
    };


    // Register trigger function in context
    registerImageUpload({ image: triggerImageUpload, video: triggerVideoUpload });

    return <>
        <input type="file" ref={imageInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />
        <input type="file" ref={videoInputRef} style={{ display: "none" }} accept="video/*" onChange={handleVideoUpload} />
    </>
}
