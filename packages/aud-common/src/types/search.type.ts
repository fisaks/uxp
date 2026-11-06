import { Collection, LibraryAlbum, LibraryArtist } from "./library.type";
import { QueueTrack } from "./player.type";
import { PlaylistSummary } from "./playlist.type";

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

/** Marks the start and end of the matched text in `LibrarySearchHit.highlighted`. Not HTML: the UI splits the text at these and marks what is between. */
export const HIGHLIGHT_START = "\uE000";
export const HIGHLIGHT_END = "\uE001";

/** Where the user is when searching. The hits of that artist or album are ranked first, everything else is still found. */
export type LibrarySearchContext = { artistId?: string; albumId?: string };

export type LibrarySearchRequest = {
    query: string;
    context?: LibrarySearchContext;
    /** The most hits per group, 5 by default (the dropdown), at most 100 (the results page). */
    limit?: number;
    /** Only this collection is searched: "music" leaves out the books, "audiobooks" only has the books. */
    collection?: Collection;
    /** Only tracks and albums can be filtered by genre or year, so a filter leaves out the other groups. */
    genre?: string;
    yearFrom?: number;
    yearTo?: number;
};

/** A hit as the library knows the item, with the matched text of its name fields: field name -> text with `HIGHLIGHT_START` / `HIGHLIGHT_END` around the match. */
export type LibrarySearchHit<T> = { item: T; highlighted: Record<string, string> };

export type LibrarySearchAlbum = { album: LibraryAlbum; artist: string };

export type LibrarySearchResponse = {
    query: string;
    artists: LibrarySearchHit<LibraryArtist>[];
    albums: LibrarySearchHit<LibrarySearchAlbum>[];
    tracks: LibrarySearchHit<QueueTrack>[];
    /** Books are albums of the audiobook library and the author is the artist. */
    books: LibrarySearchHit<LibrarySearchAlbum>[];
    playlists: LibrarySearchHit<PlaylistSummary>[];
    /** The values of the matching tracks and albums, with how many each has, for the filter chips. */
    facets: { genres: Record<string, number>; years: Record<string, number> };
};

/** The answer to the health check: whether search is switched on and, when it is, whether Meilisearch answers. */
export type SearchReachability = {
    enabled: boolean;
    reachable: boolean;
};

export type SpotifySearchRequest = { query: string; offset?: number };

/** The tracks of Spotify that match, as tracks of the queue (their id is the URI), one page of them; `hasMore` when another page may follow. */
export type SpotifySearchResponse = { query: string; tracks: QueueTrack[]; hasMore: boolean };
