import { useEffect, useState } from "react";
import { createStreamLink, streamUrl } from "../../api/home-video-api";

/** The link to the stream of a video, made when `enabled` and again for the next video, since a link runs out. Nothing is made before. */
export const useStreamUrl = (id: string, enabled = true) => {
    const [url, setUrl] = useState<string>();
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        setUrl(undefined);
        setFailed(false);
        if (!enabled) return;
        let current = true;
        createStreamLink(id)
            .then((link) => current && setUrl(streamUrl(link)))
            .catch(() => current && setFailed(true));
        return () => {
            current = false;
        };
    }, [id, enabled]);
    return { url, failed };
};
