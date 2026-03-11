import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HubIcon from "@mui/icons-material/Hub";
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectTopicPattern, selectTopicTrace } from "../topicTraceSelector";

export const TopicTracePage: React.FC = () => {
    const { sendMessage } = useUHNWebSocket();
    const bottomRef = useRef<HTMLDivElement>(null);
    const messages = useSelector(selectTopicTrace());
    const topicPattern = useSelector(selectTopicPattern());

    const handleStartTrace = () => {
        if (topicPattern) {
            sendMessage("topic:unsubscribe", { topicPattern });
        } else {
            sendMessage("topic:subscribe", { topicPattern: "uhn/#" });
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <HubIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Topic Trace</Typography>
                <Button
                    variant={topicPattern ? "outlined" : "contained"}
                    size="small"
                    onClick={handleStartTrace}
                >
                    {topicPattern ? "Stop" : "Start"}
                </Button>
            </Box>
            <Box mt={2}>
                <Stack spacing={1}>
                    {messages.map((msg, idx) => (
                        <Accordion key={idx} disableGutters variant="outlined" sx={{ "&::before": { display: "none" } }}>
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
                                        variant="outlined"
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
                            <AccordionDetails>
                                <Box
                                    component="pre"
                                    sx={{
                                        m: 0,
                                        fontFamily: "JetBrains Mono, Consolas, monospace",
                                        fontSize: "0.85rem",
                                        bgcolor: "action.hover",
                                        p: 1.5,
                                        borderRadius: 1,
                                        overflowX: "auto",
                                        color: "text.primary",
                                    }}
                                >
                                    {JSON.stringify(msg.message, null, 2)}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                    <div ref={bottomRef} />
                </Stack>
            </Box>
        </Box>
    );
};