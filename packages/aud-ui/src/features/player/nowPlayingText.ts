import { PlayerState, QueueTrack, RepeatMode, SpotifyNowPlaying } from "@aud/common";
import { partNames } from "../audiobook/partNames";

/** A song is told with the album it is from after the performer. */
export const songSubtitle = (artist: string, album: string) => [artist, album].filter(Boolean).join(" · ");

/** What is said about the track that is playing: a song by its title with the performer and album under it, a book by its title with the part and the author under it. */
export const nowPlayingText = (queue: QueueTrack[], currentIndex: number): { title: string; subtitle: string; isBook: boolean } => {
    const track = queue[currentIndex];
    const isBook = queue[0]?.collection === "audiobooks";
    // The file names of the parts of a book say nothing, so the book is shown, and the part when there are several.
    const part = isBook && queue.length > 1 ? partNames(queue)[currentIndex] : undefined;
    return {
        title: isBook ? track.albumTitle : track.title,
        subtitle: isBook ? [part, track.artist].filter(Boolean).join(" · ") : songSubtitle(track.artist, track.albumTitle),
        isBook,
    };
};

/** What plays after the current track of the queue, told like the line of a song, or undefined when the queue ends there (repeat one stays on the track). */
export const upNextText = (queue: QueueTrack[], currentIndex: number, repeat: RepeatMode): string | undefined => {
    if (repeat === "one") return undefined;
    const nextIndex = currentIndex + 1 < queue.length ? currentIndex + 1 : repeat === "all" ? 0 : undefined;
    if (nextIndex === undefined || nextIndex === currentIndex) return undefined;
    const { title, subtitle } = nowPlayingText(queue, nextIndex);
    return [title, subtitle].filter(Boolean).join(" · ");
};

/** What comes next for the player: after the Spotify track while Spotify plays, else after the track of the queue. */
export const playerUpNextText = (state: PlayerState, spotify: SpotifyNowPlaying | null | undefined): string | undefined => {
    if (!spotify) return upNextText(state.queue, state.currentIndex ?? 0, state.repeat);
    const next = spotify.upcoming[0];
    return next && songSubtitle(next.title, next.artist);
};
