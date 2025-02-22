import { Box, FormControl, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { LoadingButton } from "@uxp/ui-lib";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DemoAppErrorHandler, DemoAppWebSocketResponseListener, useDemoWebSocket } from "../../app/DemoAppBrowserWebSocketManager";

const BinaryResponsePage = () => {

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    // always use useMemo for listeners other wise the message listing on and off feature don't work as espected
    const listeners = useMemo(() => {
        return {
            binary_response: (message, data) => {
                // In `listeners`, we can always assume `message.success` is `true`.
                // If `message.success` is `false`, the message is routed to the error handler instead.
                //
                // The reason for this is that errors are not necessarily tied to the same action type.
                // Depending on where the error occurs—before the handler is chosen or during handler execution—
                // the system may not know which action was originally intended to handle it.

                if (!data) return;
                const blob = new Blob([data], { type: "image/jpeg" });

                const imageUrl = URL.createObjectURL(blob);

                setImageUrl(imageUrl);
                setResponse(`✅ Success header: ${JSON.stringify(message)}`);
            }

        } as DemoAppWebSocketResponseListener
    }, [])

    useEffect(() => {
        return () => {
            if (imageUrl) {
                console.log("Revoking URL", imageUrl);
                URL.revokeObjectURL(imageUrl); // free memory when changed
            }
        }
    }, [imageUrl]);

    const errorHandler: DemoAppErrorHandler = useCallback((({ action, error, errorDetails }) => {
        // If the error is from the handler itself, the action will be "binary_response".
        // If the error is from the infrastructure (WebSocket or system-level issue),
        // the action will be "get_binary_message" the sending action because we don't know which handler
        // was supposed to process the "get_binary_message".
        if (action === "get_binary_message" || action === "binary_response") {
            console.error(`Error in Binary WebSocket action ${action}`, error, errorDetails);
            setResponse(`❌ Not Success: action: ${action} error: ${JSON.stringify(error)} errorDetails: ${JSON.stringify(errorDetails)}`);
            return true;
        }
        return false;
    }) as DemoAppErrorHandler, [])

    const { sendMessage } = useDemoWebSocket(listeners, errorHandler);
    const [message, setMessage] = useState<string>("");
    const [responseType, setResponseType] = useState<"success" | "error">("success"); // ✅ New state
    const [response, setResponse] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    const handleSendMessage = async () => {
        sendMessage("get_binary_message", { message, responseType });
    };

    return (
        <Box sx={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h1">WebSocket Binary Response Demo</Typography>
            <TextField
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}

                margin="normal"
            />
            <FormControl component="fieldset">
                <Typography variant="body2">Response Type:</Typography>
                <RadioGroup
                    row
                    value={responseType}
                    onChange={(e) => setResponseType(e.target.value as "success" | "error")}
                >
                    <FormControlLabel value="success" control={<Radio />} label="Success" />
                    <FormControlLabel value="error" control={<Radio />} label="Error" />
                </RadioGroup>
            </FormControl>
            <LoadingButton
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
                isLoading={loading}
            >
                {loading ? "Sending..." : "Send Message"}
            </LoadingButton>

            {response && (
                <Typography variant="body1" style={{ marginTop: 20 }}>
                    {response}
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

export default BinaryResponsePage;
