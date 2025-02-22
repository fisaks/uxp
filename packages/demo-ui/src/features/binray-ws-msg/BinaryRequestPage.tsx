import { Box, Button, Typography } from "@mui/material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DemoAppErrorHandler, DemoAppWebSocketResponseListener, useDemoWebSocket } from "../../app/DemoAppBrowserWebSocketManager";

const BinaryRequestPage = () => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [descrption, setDescription] = useState<string | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const listeners = useMemo(() => {
        return {
            upload_response: (message, data) => {

                if (!data) return;

                const blob = new Blob([data], { type: message.payload?.mimeTYpe });
                const imageUrl = URL.createObjectURL(blob);

                setImageUrl(imageUrl);
                setDescription(`Uploaded file ${message.payload?.fileName} with mime type ${message.payload?.mimeTYpe}`);
            }

        } as DemoAppWebSocketResponseListener
    }, [])

    const errorHandler: DemoAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        if (action === "upload_binary_message" || action === "upload_response") {
            setDescription(`Error during upload: ${error.code}`);
            console.error(`Error in Binary WebSocket action ${action}`, error, errorDetails);
            return true;
        }
        return false;
    }) as DemoAppErrorHandler, [])

    const { sendBinaryMessage } = useDemoWebSocket(listeners, errorHandler);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            console.log("Uploading file", event.target.files[0]);
            const file = await event.target.files[0].arrayBuffer()
            if (file) {
                sendBinaryMessage("upload_binary_message", {
                    fileName: event.target.files[0].name,
                    mimeTYpe: event.target.files[0].type
                }, file);
            }
        }
    };
    useEffect(() => {
        return () => {
            if (imageUrl) {
                console.log("Revoking URL", imageUrl);
                URL.revokeObjectURL(imageUrl); // free memory when changed
            }
        }
    }, [imageUrl]);

    return (
        <Box sx={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h1">WebSocket Binary Request Demo</Typography>
            <Typography variant="body1">
                A simple example demonstrating how to send a binary WebSocket message from the browser. <br />
                Note: In most cases, **multipart file uploads** (via HTTP) are a better option for file uploads than WebSockets.
            </Typography>

            <div>
                <Button variant="contained" color="primary"
                    sx={{ width: "auto" }}
                    onClick={() => fileInputRef.current?.click()}>
                    Upload Image
                </Button>
            </div>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} />
            {descrption && (
                <Typography variant="body2" style={{ marginTop: 20 }}>
                    {descrption}
                </Typography>
            )}

            {imageUrl && <>
                <img src={imageUrl} />
                <a href={imageUrl} target="_blank">Download</a>
            </>
            }

        </Box>
    );
};

export default BinaryRequestPage;
