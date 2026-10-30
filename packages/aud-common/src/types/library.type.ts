/** The music library as the UI sees it. Artists and albums are the folders of the music root: Artist/Album/tracks. */
export type LibraryArtist = {
    id: string;
    name: string;
    albumCount: number;
};

export type LibraryAlbum = {
    id: string;
    artistId: string;
    title: string;
    year?: number;
    trackCount: number;
    /** True when the album folder has a picture that can be used as cover. */
    hasCover: boolean;
};

export type LibraryTrack = {
    id: string;
    albumId: string;
    artistId: string;
    title: string;
    /** The performer of the track, which differs from the artist folder on compilations. */
    artist: string;
    trackNo?: number;
    discNo?: number;
    durationSec?: number;
};

export type LibraryStatus = {
    /** True while the music root is being scanned, so the lists may be incomplete. */
    scanning: boolean;
    /** When the library was last scanned. */
    scannedAt?: string;
    trackCount: number;
};

export type LibraryArtistsResponse = {
    artists: LibraryArtist[];
    status: LibraryStatus;
};

export type LibraryAlbumsResponse = {
    artist: LibraryArtist;
    albums: LibraryAlbum[];
};

export type LibraryTracksResponse = {
    artist: LibraryArtist;
    album: LibraryAlbum;
    tracks: LibraryTrack[];
};

/** Which library a cover is in. */
export type Collection = "music" | "audiobooks";

/** The parameters of the path of the cover route: `/cover/:collection/:albumId`. */
export type CoverParams = {
    collection: Collection;
    albumId: string;
};
