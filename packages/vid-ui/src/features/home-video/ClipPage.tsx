import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createStreamLink, streamUrl, thumbnailUrl } from "../../api/home-video-api";
import { ClipForm } from "./ClipForm";
import { clipPath } from "./ClipTile";
import { clipName, formatDate } from "./clipFormat";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useHomeVideos } from "./HomeVideosProvider";

// On a phone the buttons are only arrows, so the name of the clip has the room.
const STEP_BUTTON_SX = { minWidth: 0, px: { xs: 0.5, sm: 1.5 } };
const STEP_LABEL_SX = { display: { xs: "none", sm: "inline" } };

/** The link to the stream is made when the page opens, and again for the next clip. */
const useStreamUrl = (id: string) => {
    const [url, setUrl] = useState<string>();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let current = true;
        setUrl(undefined);
        setFailed(false);
        createStreamLink(id)
            .then((link) => current && setUrl(streamUrl(link)))
            .catch(() => current && setFailed(true));
        return () => {
            current = false;
        };
    }, [id]);
    return { url, failed };
};

export const ClipPage: React.FC = () => {
    const { id = "" } = useParams();
    const { clips } = useHomeVideos();
    const { url, failed } = useStreamUrl(id);
    const index = clips?.findIndex((c) => c.id === id) ?? -1;
    const clip = clips?.[index];

    if (!clips) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;
    if (!clip) return <Alert severity="warning">There is no such clip.</Alert>;
    const previous = clips[index - 1];
    const next = clips[index + 1];

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {/* The video is the same size for every clip, so the page does not jump when you step to the next one. */}
            <Box sx={{ bgcolor: "common.black", borderRadius: 1, overflow: "hidden", aspectRatio: "16 / 9" }}>
                {failed ? (
                    <Alert severity="error">The video could not be opened.</Alert>
                ) : (
                    url && <video key={clip.id} src={url} poster={thumbnailUrl(clip.id)} controls style={{ display: "block", width: "100%", height: "100%" }} />
                )}
            </Box>
            <Stack direction="row" alignItems="center" sx={{ my: 1.5, gap: 1 }}>
                <Button component={Link} to={previous ? clipPath(previous.id) : "#"} disabled={!previous} aria-label="Previous" sx={STEP_BUTTON_SX}>
                    <NavigateBeforeIcon />
                    <Box component="span" sx={STEP_LABEL_SX}>
                        Previous
                    </Box>
                </Button>
                <Box sx={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                    <Typography variant="subtitle1" noWrap>
                        {clipName(clip)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {clip.title && clip.date ? `${formatDate(clip.date)} · ` : ""}
                        {index + 1} of {clips.length}
                    </Typography>
                </Box>
                <Button component={Link} to={next ? clipPath(next.id) : "#"} disabled={!next} aria-label="Next" sx={STEP_BUTTON_SX}>
                    <Box component="span" sx={STEP_LABEL_SX}>
                        Next
                    </Box>
                    <NavigateNextIcon />
                </Button>
            </Stack>
            <ClipForm key={clip.id} clip={clip} />
        </Box>
    );
};
