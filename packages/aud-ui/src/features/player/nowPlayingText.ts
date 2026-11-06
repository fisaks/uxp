import { QueueTrack } from "@aud/common";
import { partNames } from "../audiobook/partNames";

/** A song is told with the album it is from after the performer. */
export const songSubtitle = (artist: string, album: string) => [artist, album].filter(Boolean).join(" · ");

/** What is said about the track that is playing: a song by its title with the performer and album under it, a book by its title with the part and the author under it. */
export const nowPlayingText = (queue: QueueTrack[], currentIndex: number): { title: string; subtitle: string; isBook: boolean } => {
    const track = queue[currentIndex];
    const isBook = queue[0]?.collection === "audiobooks";
    // The file names of the parts of a book say nothing, so the book is shown, and the part when there are several.
    const part = isBook && queue.length > 1 ? partNames(queue)[currentIndex] : undefined;
    return { title: isBook ? track.albumTitle : track.title, subtitle: isBook ? [part, track.artist].filter(Boolean).join(" · ") : songSubtitle(track.artist, track.albumTitle), isBook };
};
