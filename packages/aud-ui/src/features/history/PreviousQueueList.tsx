import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { PreviousQueue } from "@aud/common";
import React from "react";
import { usePlayerActions } from "../player/usePlayerActions";
import { dayAndTime } from "./historyFormat";

const NAMES_SHOWN = 3;

type PreviousQueueListProps = {
    queues: PreviousQueue[];
    onSaveAsPlaylist: (trackIds: string[]) => void;
};

/** The queues that were replaced or cleared, to play again. Tracks that have gone from the library are left out. */
export const PreviousQueueList: React.FC<PreviousQueueListProps> = ({ queues, onSaveAsPlaylist }) => {
    const { playTracks } = usePlayerActions();
    return (
        <>
            {queues.map((queue) => {
                const present = queue.entries.filter((entry) => entry.track);
                const trackIds = present.map((entry) => entry.track?.id ?? "");
                // The track that was current, as a place among the tracks that can be played.
                const startIndex = queue.entries.slice(0, queue.currentIndex).filter((entry) => entry.track).length;
                const names = queue.entries.slice(0, NAMES_SHOWN).map((entry) => entry.name);
                const more = queue.entries.length - names.length;
                return (
                    <Box
                        key={queue.id}
                        sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, borderBottom: 1, borderColor: "divider" }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography>
                                {queue.entries.length} {queue.entries.length === 1 ? "track" : "tracks"} · {dayAndTime(queue.replacedAt)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                                {names.join(", ")}
                                {more > 0 && ` and ${more} more`}
                            </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center">
                            <IconButton
                                size="small"
                                aria-label="Save as a playlist"
                                disabled={trackIds.length === 0}
                                onClick={() => onSaveAsPlaylist(trackIds)}
                            >
                                <LibraryAddIcon fontSize="small" />
                            </IconButton>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={trackIds.length === 0}
                                onClick={() => playTracks(trackIds, startIndex)}
                            >
                                Play
                            </Button>
                        </Stack>
                    </Box>
                );
            })}
        </>
    );
};
