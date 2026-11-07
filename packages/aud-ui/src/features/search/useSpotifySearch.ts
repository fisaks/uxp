import { LibraryAlbum, LibraryArtist, QueueTrack, SpotifySearchResponse, SpotifySearchType } from "@aud/common";
import { useCallback, useEffect, useState } from "react";
import { useAudioWebSocket } from "../../app/AudioBrowserWebSocketManager";
import { useAppSelector } from "../../hooks";
import { selectConnected } from "../connection/connectionSelectors";

// A little longer than the library's: Spotify is asked over the internet, so a question is not sent for each letter.
const DEBOUNCE_MS = 400;

const ALL_TYPES: SpotifySearchType[] = ["track", "artist", "album"];

const sameTrack = (a: QueueTrack, b: QueueTrack) => key(a) === key(b);
const key = (track: QueueTrack) => `${track.artist}\u0000${track.title}`.toLowerCase();

/**
 * Searches Spotify for the same words, apart from the library: the library's hits show at once and Spotify's are added when they
 * come. A search that fails or finds nothing gives no tracks, so the library's hits stand alone. The tracks that the library has
 * (the same artist and title) are left out, so a track is not shown twice. `more` asks for the next page, which is added.
 */
export const useSpotifySearch = (query: string, enabled: boolean, localTracks: QueueTrack[]) => {
    const { sendMessageAsync } = useAudioWebSocket();
    const connected = useAppSelector(selectConnected);
    const [found, setFound] = useState<QueueTrack[]>([]);
    const [artists, setArtists] = useState<LibraryArtist[]>([]);
    const [albums, setAlbums] = useState<LibraryAlbum[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const trimmed = query.trim();

    const ask = useCallback(
        async (offset: number, types: SpotifySearchType[]): Promise<SpotifySearchResponse | undefined> => {
            try {
                return (await sendMessageAsync("spotify_search", { query: trimmed, offset, types })).payload as SpotifySearchResponse;
            } catch {
                return undefined;
            }
        },
        [trimmed, sendMessageAsync]
    );

    useEffect(() => {
        if (!trimmed || !connected || !enabled) {
            setFound([]);
            setArtists([]);
            setAlbums([]);
            setHasMore(false);
            return;
        }
        let current = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            const answer = await ask(0, ALL_TYPES);
            if (!current) return;
            setLoading(false);
            setFound(answer?.tracks ?? []);
            setArtists(answer?.artists ?? []);
            setAlbums(answer?.albums ?? []);
            setHasMore(answer?.hasMore ?? false);
        }, DEBOUNCE_MS);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [trimmed, connected, enabled, ask]);

    const more = async () => {
        setLoading(true);
        const answer = await ask(found.length, ["track"]);
        setLoading(false);
        if (answer) {
            setFound((previous) => [...previous, ...answer.tracks.filter((track) => !previous.some((item) => item.id === track.id))]);
            setHasMore(answer.hasMore);
        }
    };

    const tracks = found.filter((track) => !localTracks.some((local) => sameTrack(local, track)));
    return { tracks, artists, albums, hasMore, loading, more };
};
