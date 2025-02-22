import { Box, FormControl, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { LoadingButton, WebSocketError, WebSocketTimeoutError } from "@uxp/ui-lib";
import { useState } from "react";
import { useDemoWebSocket } from "../../app/DemoAppBrowserWebSocketManager";

const AsyncMessagingPage = () => {
    const { sendMessageAsync } = useDemoWebSocket();

    const [waitTimeMs, setWaitTimeMs] = useState(1000);
    const [timeoutMs, setTimeoutMs] = useState(5000);
    const [response, setResponse] = useState<string | null>(null);
    const [responseType, setResponseType] = useState<"success" | "error">("success"); // ✅ New state
    const [loading, setLoading] = useState(false);

    const handleSendMessage = async () => {
        setLoading(true);
        setResponse(null);

        try {
            // if this resolv we can expect that result in success true
            // if not the promise will reject and WebSocketError or WebSocketTimeoutError been thrown
            const result = await sendMessageAsync("test_async_message", { waitTimeMs, responseType }, timeoutMs);

            setResponse(`✅ Success: ${JSON.stringify(result.payload)}`);

        } catch (error) {
            console.error(error);
            if (error instanceof WebSocketError) {
                setResponse(`❌ WebSocketError:  action ${error.action} code is ${error.error.code} and message ${error.message}`);
            } else if (error instanceof WebSocketTimeoutError) {

                setResponse(`⏳ Timeout! Server didn't respond within ${error.timeoutMs}ms for action ${error.action}`);
            } else {
                setResponse(`❌ Unknown Error: ${(error as any).message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h1"  >WebSocket Async Messaging Demo</Typography>
            <TextField
                label="Wait Time (ms)"
                type="number"
                value={waitTimeMs}
                onChange={(e) => setWaitTimeMs(Number(e.target.value))}

                margin="normal"
            />
            <TextField
                label="Timeout (ms)"
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}

                margin="normal"
            />
            <FormControl component="fieldset">
                <Typography variant="body1">Response Type:</Typography>
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
        </Box>
    );
};

export default AsyncMessagingPage;
