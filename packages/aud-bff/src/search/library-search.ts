import {
    HIGHLIGHT_END,
    HIGHLIGHT_START,
    LibrarySearchAlbum,
    LibrarySearchHit,
    LibrarySearchRequest,
    LibrarySearchResponse,
    SEARCH_INDEX,
} from "@aud/common";
import { SearchHit, SearchQuery, SearchService } from "@uxp/bff-common";
import { audiobookService, libraryService, LibraryService } from "../library/library.service";
import { playlistService } from "../playlists/playlist.service";

const DEFAULT_LIMIT = 5;
/** A hit of a library item that is gone since the index was made is left out, so a group is searched for a few more than it shows. */
const SPARE_HITS = 5;

type Kind = keyof typeof SEARCH_INDEX;
type Hit = SearchHit<Record<string, unknown>>;
type Request = { kind: Kind; query: SearchQuery };

/** The fields that are highlighted, which are the ones that are shown as text. */
const HIGHLIGHT: Record<Kind, string[]> = {
    tracks: ["title", "artist", "album"],
    albums: ["title", "artist"],
    artists: ["name"],
    books: ["title", "author"],
    playlists: ["name"],
};

const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

/** The filter that narrows a group to the context, for the groups that can be narrowed. The album is narrower than the artist. */
function contextFilter(kind: Kind, { context }: LibrarySearchRequest): string | undefined {
    const { artistId, albumId } = context ?? {};
    switch (kind) {
        case "tracks":
            return albumId ? `albumId = ${quote(albumId)}` : artistId ? `artistId = ${quote(artistId)}` : undefined;
        case "albums":
            return albumId ? `id = ${quote(albumId)}` : artistId ? `artistId = ${quote(artistId)}` : undefined;
        case "artists":
            return artistId ? `id = ${quote(artistId)}` : undefined;
        default:
            return undefined;
    }
}

/** Albums have no genre, and artists, books and playlists have neither genre nor year: a filter on those leaves the group out. */
function groups({ collection, genre, yearFrom, yearTo }: LibrarySearchRequest): Kind[] {
    const hasYear = yearFrom !== undefined || yearTo !== undefined;
    const kinds: Kind[] = [];
    if (collection !== "audiobooks") {
        kinds.push("tracks");
        if (!genre) {
            kinds.push("albums");
        }
        if (!genre && !hasYear) {
            kinds.push("artists", "playlists");
        }
    }
    if (collection !== "music" && !genre && !hasYear) {
        kinds.push("books");
    }
    return kinds;
}

function rangeFilters({ genre, yearFrom, yearTo }: LibrarySearchRequest): string[] {
    return [
        ...(genre ? [`genres = ${quote(genre)}`] : []),
        ...(yearFrom !== undefined ? [`year >= ${yearFrom}`] : []),
        ...(yearTo !== undefined ? [`year <= ${yearTo}`] : []),
    ];
}

function queriesFor(request: LibrarySearchRequest, limit: number): Request[] {
    const narrowing = rangeFilters(request);
    return groups(request).flatMap((kind) => {
        const query: SearchQuery = {
            indexUid: SEARCH_INDEX[kind],
            q: request.query.trim(),
            limit: limit + SPARE_HITS,
            matchingStrategy: "all",
            attributesToHighlight: HIGHLIGHT[kind],
            highlightPreTag: HIGHLIGHT_START,
            highlightPostTag: HIGHLIGHT_END,
            filter: narrowing.length > 0 ? narrowing : undefined,
        };
        const inContext = contextFilter(kind, request);
        // The context comes first: the same query narrowed to it, whose hits are put before those of the whole index.
        return inContext
            ? [
                  { kind, query: { ...query, filter: [...narrowing, inContext] } },
                  { kind, query },
              ]
            : [{ kind, query }];
    });
}

/** Only the fields that were asked to be highlighted: Meilisearch returns the others too. */
const toHit = <T>(kind: Kind, hit: Hit, item: T | undefined): LibrarySearchHit<T> | undefined =>
    item && {
        item,
        highlighted: Object.fromEntries(
            HIGHLIGHT[kind].flatMap((field) => (typeof hit.highlighted?.[field] === "string" ? [[field, hit.highlighted[field]]] : []))
        ),
    };

const toAlbumHit = (kind: Kind, hit: Hit, library: LibraryService): LibrarySearchHit<LibrarySearchAlbum> | undefined => {
    const album = library.getAlbum(hit.doc.id as string);
    return toHit(kind, hit, album && { album, artist: library.getArtist(album.artistId)?.name ?? "" });
};

/**
 * Searches music, books and playlists with one request to Meilisearch. A group that can be narrowed to the context (the artist or album the user is in)
 * is searched twice, for the context and for everything: the hits of the context are first, then the rest, each at most once.
 * Hits are looked up in the libraries and playlists, which are the truth.
 */
export async function librarySearch(search: SearchService, request: LibrarySearchRequest): Promise<LibrarySearchResponse> {
    const limit = request.limit ?? DEFAULT_LIMIT;
    const requests = queriesFor(request, limit);
    // The chips show what else can be chosen, so the genres and years are counted for the words alone, not for the filters.
    const facets: SearchQuery = {
        indexUid: SEARCH_INDEX.tracks,
        q: request.query.trim(),
        limit: 0,
        matchingStrategy: "all",
        facets: ["genres", "year"],
    };
    const results = await search.multiSearch<Record<string, unknown>>([...requests.map(({ query }) => query), facets]);

    const hitsOf = (kind: Kind): Hit[] => {
        const seen = new Set<unknown>();
        return requests
            .flatMap(({ kind: k }, i) => (k === kind ? results[i].hits : []))
            .filter(({ doc }) => !seen.has(doc.id) && seen.add(doc.id));
    };
    const take = <T>(kind: Kind, resolve: (hit: Hit) => LibrarySearchHit<T> | undefined) =>
        hitsOf(kind)
            .map(resolve)
            .filter((hit): hit is LibrarySearchHit<T> => hit !== undefined)
            .slice(0, limit);
    const playlists = playlistService.list();
    const counted = results[results.length - 1].facets ?? {};

    return {
        query: request.query.trim(),
        artists: take("artists", (hit) => toHit("artists", hit, libraryService.getArtist(hit.doc.id as string))),
        albums: take("albums", (hit) => toAlbumHit("albums", hit, libraryService)),
        tracks: take("tracks", (hit) => toHit("tracks", hit, libraryService.getTrack(hit.doc.id as string))),
        books: take("books", (hit) => toAlbumHit("books", hit, audiobookService)),
        playlists: take("playlists", (hit) =>
            toHit(
                "playlists",
                hit,
                playlists.find(({ id }) => id === hit.doc.id)
            )
        ),
        facets: { genres: counted.genres ?? {}, years: counted.year ?? {} },
    };
}
