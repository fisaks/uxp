import { LibrarySearchContext, LibrarySearchResponse } from "@aud/common";
import { useEffect, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppSelector } from "../../hooks";
import { selectConnected } from "../connection/connectionSelectors";

const DEBOUNCE_MS = 250;
/** The most hits of each group in the dropdown. */
const DROPDOWN_LIMIT = 5;

/**
 * Searches while the user types: the question is sent when the typing has paused, and only the answer to the latest
 * question is kept. The previous hits stay until the new ones arrive, so the dropdown does not flicker.
 */
export const useLibrarySearch = (query: string, context: LibrarySearchContext) => {
    const { sendMessageAsync } = useAudioWebSocket();
    const connected = useAppSelector(selectConnected);
    const [response, setResponse] = useState<LibrarySearchResponse | undefined>(undefined);
    const [failed, setFailed] = useState(false);
    const trimmed = query.trim();
    const { artistId, albumId } = context;

    useEffect(() => {
        if (!trimmed || !connected) {
            setResponse(undefined);
            setFailed(false);
            return;
        }
        let current = true;
        const timer = setTimeout(async () => {
            try {
                const answer = await sendMessageAsync("library_search", {
                    query: trimmed,
                    context: { artistId, albumId },
                    limit: DROPDOWN_LIMIT,
                });
                if (!current) return;
                setResponse(answer.payload as LibrarySearchResponse);
                setFailed(false);
            } catch {
                if (current) setFailed(true);
            }
        }, DEBOUNCE_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [trimmed, connected, artistId, albumId, sendMessageAsync]);

    return { response, failed };
};
