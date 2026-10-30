import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { Box, ListSubheader, Typography } from "@mui/material";
import { HistoryPlay } from "@aud/common";
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayerActions } from "../player/usePlayerActions";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { groupByDay, timeOf } from "./historyFormat";

const TIME_WIDTH = 52;

type PlayedListProps = {
    plays: HistoryPlay[];
};

/** The tracks that were played, newest first, in a group for each day. Pressing one plays it, and the + puts it in the queue. */
export const PlayedList: React.FC<PlayedListProps> = ({ plays }) => {
    const navigate = useNavigate();
    const { hadQueue, playTracks, playNow, enqueue } = usePlayerActions();
    const groups = useMemo(() => groupByDay(plays), [plays]);
    return (
        <>
            {groups.map(({ day, plays: dayPlays }) => (
                <Box key={day}>
                    <ListSubheader disableGutters sx={{ bgcolor: "transparent" }}>
                        {day}
                    </ListSubheader>
                    {dayPlays.map((play) => {
                        const { track, book } = play;
                        const found = track ?? book;
                        return (
                            <Box
                                key={`${play.playedAt}-${play.id}`}
                                sx={{ display: "flex", alignItems: "center", borderBottom: 1, borderColor: "divider" }}
                            >
                                <Typography color="text.secondary" sx={{ width: TIME_WIDTH, flexShrink: 0 }}>
                                    {timeOf(play.playedAt)}
                                </Typography>
                                <Box
                                    // With a queue the track is played now and the queue is kept, without one it is played alone.
                                    // A book opens its page, where it is continued or started over.
                                    onClick={
                                        book
                                            ? () => navigate(`/audiobooks/book/${book.albumId}`)
                                            : track
                                              ? () => (hadQueue ? playNow(track.id) : playTracks([track.id]))
                                              : undefined
                                    }
                                    sx={{ flex: 1, minWidth: 0, py: 1, cursor: found ? "pointer" : "default" }}
                                >
                                    <Typography sx={{ overflowWrap: "anywhere" }} color={found ? "text.primary" : "text.disabled"}>
                                        {book ? book.title : track ? track.title : play.name}
                                    </Typography>
                                    <Typography variant="body2" color={found ? "text.secondary" : "text.disabled"}>
                                        {book ? `Audiobook · ${book.artist}` : track ? track.artist : "Missing from the library"}
                                    </Typography>
                                </Box>
                                {track && (
                                    <LabelledIconButton label="Add to queue" onClick={() => enqueue([track.id])}>
                                        <PlaylistAddIcon fontSize="small" />
                                    </LabelledIconButton>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            ))}
        </>
    );
};
