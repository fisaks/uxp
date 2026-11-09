import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { CastQueue } from "@vid/common";
import React from "react";
import { thumbnailUrl } from "../../api/home-video-api";
import { clipName, formatDuration } from "../home-video/clipFormat";
import { useGetClipsQuery } from "../home-video/home-video.api";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { SortableList, uniqueKeys } from "../shared/SortableList";

const QUEUE_POSTER = { width: 64, height: 36 };

type QueueListProps = {
    queue: CastQueue;
    onJump: (index: number) => void;
    onRemove: (index: number) => void;
    /** Answering false puts the list back as it was. */
    onMove: (from: number, to: number) => Promise<boolean | void> | void;
    /** Adds a button to each clip that opens its page. */
    onOpenClip?: (clipId: string) => void;
};

/** The clips of a queue, the one that plays marked: drag to reorder, click to play one, a button to remove one. */
export const QueueList: React.FC<QueueListProps> = ({ queue, onJump, onRemove, onMove, onOpenClip }) => {
    const { data: clips } = useGetClipsQuery();
    const keys = uniqueKeys(queue.clipIds);
    return (
        <SortableList
            items={queue.clipIds}
            getKey={(_id, index) => keys[index]}
            onMove={onMove}
            renderItem={(id, index, handle) => {
                const item = clips?.find((c) => c.id === id);
                const current = index === queue.index;
                return (
                    <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ py: 0.5, borderLeft: 3, borderColor: current ? "primary.main" : "transparent", pl: 0.5 }}
                    >
                        {handle}
                        <ButtonBase
                            onClick={() => onJump(index)}
                            sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-start", gap: 1.5, textAlign: "left" }}
                        >
                            <Box
                                component="img"
                                src={thumbnailUrl(id)}
                                alt=""
                                sx={{ ...QUEUE_POSTER, flexShrink: 0, objectFit: "cover", borderRadius: 0.5, bgcolor: "action.hover" }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography noWrap sx={{ fontWeight: current ? 700 : 400 }}>
                                    {item ? clipName(item) : "Missing clip"}
                                </Typography>
                                {item && (
                                    <Typography noWrap variant="caption" color="text.secondary">
                                        {formatDuration(item.durationSeconds)}
                                    </Typography>
                                )}
                            </Box>
                        </ButtonBase>
                        {item && onOpenClip && (
                            <LabelledIconButton label="Open the clip page" onClick={() => onOpenClip(id)}>
                                <OpenInNewIcon />
                            </LabelledIconButton>
                        )}
                        <LabelledIconButton label="Remove from the queue" onClick={() => onRemove(index)}>
                            <CloseIcon />
                        </LabelledIconButton>
                    </Stack>
                );
            }}
        />
    );
};
