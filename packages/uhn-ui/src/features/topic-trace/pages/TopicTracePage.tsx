import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectTopicPattern, selectTopicTrace } from "../topicTraceSelector";

export const TopicTracePage: React.FC = () => {
    const { sendMessage, sendMessageAsync } = useUHNWebSocket();
    const bottomRef = useRef<HTMLDivElement>(null);
    const messages = useSelector(selectTopicTrace());
    const topicPattern = useSelector(selectTopicPattern());

    const handleStartTrace = () => {
        if (topicPattern) {
            sendMessage("topic:unsubscribe", { topicPattern });
        } else {
            sendMessage("topic:subscribe", { topicPattern: "uhn/#" });
        }
    }



    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    return (
        <Box sx={{ p: 2, bgcolor: "background.default" }}>
            <Typography variant="h5" gutterBottom>
                MQTT/WebSocket Trace
            </Typography>
            <Button onClick={handleStartTrace}>{topicPattern ? "Stop trace" : "Start Trace"}</Button>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
                {messages.map((msg, idx) => (
                    <Accordion key={idx} disableGutters>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}
                            sx={{
                                minHeight: 44,
                                minWidth: 0,
                                "& .MuiAccordionSummary-content": { minWidth: 0 }
                            }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ width: "100%", minWidth: 0 }}>
                                <Chip
                                    label={msg.topic}
                                    size="small"
                                    color="primary"
                                    sx={{ fontWeight: 700, bgcolor: "primary.light" }}
                                />
                                <Typography
                                    variant="body2"
                                    sx={{
                                        flex: 1,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        minWidth: 0,
                                        fontFamily: "JetBrains Mono, Consolas, monospace",
                                    }}
                                    color="text.secondary"
                                    title={JSON.stringify(msg.message)}
                                >
                                    {JSON.stringify(msg.message)}
                                </Typography>
                            </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: "background.paper" }}>
                            <pre style={{
                                margin: 0,
                                fontFamily: "JetBrains Mono, Consolas, monospace",
                                fontSize: "0.97em",
                                background: "#282a3610",
                                padding: 8,
                                borderRadius: 4,
                                overflowX: "auto"
                            }}>
                                {JSON.stringify(msg.message, null, 2)}
                            </pre>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    )
}