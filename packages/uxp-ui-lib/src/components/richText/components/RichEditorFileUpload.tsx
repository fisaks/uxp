import { useCallback, useRef } from "react";
import { useRichEditorUI } from "../RichEditorContext";

export function RichEditorFileUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { onImageUpload, editor, registerTriggerImageUpload } = useRichEditorUI();

    const triggerImageUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, [fileInputRef.current]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            const imageUrl = await onImageUpload(file);
            if (imageUrl) {
                editor?.chain().focus().setImage({ src: imageUrl }).run();
            }
        }
    };

    // Register trigger function in context
    registerTriggerImageUpload(triggerImageUpload);

    return <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />;
}
