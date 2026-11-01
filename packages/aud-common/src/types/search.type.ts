/** The names of the search indexes, one per kind of item. */
export const SEARCH_INDEX = {
    tracks: "aud_tracks",
    albums: "aud_albums",
    artists: "aud_artists",
    books: "aud_books",
    playlists: "aud_playlists",
} as const;

/**
 * Doc, describing what information is saved in the search database (Meilisearch) for each item of the library. A search looks through these, and a hit is
 * one of them. For a track it is the title, artist, album, genre and so on, the words a search can match.
 * The id is the id of the item in the library, so a hit can be opened or played.
 */
export type SearchTrackDoc = {
    id: string;
    albumId: string;
    artistId: string;
    title: string;
    artist: string;
    album: string;
    /** The name of the file without folders, which is what a track with poor tags is called. */
    fileName: string;
    genres: string[];
    composers: string[];
    year?: number;
};

export type SearchAlbumDoc = { id: string; artistId: string; title: string; artist: string; year?: number };

export type SearchArtistDoc = { id: string; name: string };

/** A book is an album of the audiobook library, its author an artist. */
export type SearchBookDoc = { id: string; authorId: string; title: string; author: string };

export type SearchPlaylistDoc = { id: string; name: string };
