# AUD search

One search box in the header of AUD searches the music, the audiobooks and the playlists. The search is done by
Meilisearch, a separate service. The files stay the truth: the indexes are rebuilt from the libraries and the
playlists, so the Meilisearch volume does **not need a backup**. After a loss the BFF fills the indexes again at
its next start.

Without Meilisearch AUD works as before, only without the search box (`LibraryStatus.searchAvailable` is false).

## Configuration (BFF environment)

| Variable             | Meaning                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `MEILI_URL`          | Address of Meilisearch. Unset = search is off.                                                       |
| `MEILI_API_KEY`      | The scoped key of AUD (below). Production.                                                           |
| `MEILI_MASTER_KEY`   | Development only: the BFF then makes the scoped key itself. Never give the master key to a remote BFF. |

The scoped key is named `aud`, may touch only the `aud_*` indexes and has the actions `search`, `documents.*`,
`indexes.create`, `indexes.get`, `settings.update` and `tasks.get`. It cannot make keys or read other apps' data.

## Indexes

`aud_tracks`, `aud_albums`, `aud_artists`, `aud_books`, `aud_playlists`. Ids are the ids of the library, so a hit
opens the existing view. Tracks are searched by title, artist, album, file name, genre, composer and year;
albums by title and artist; artists and playlists by name; books by title and author. Audiobook tracks are not
indexed. Playlists are found by name only.

`aud-bff/src/search/search-indexer.ts` indexes at start and again (2 s after the last change, one run at a time)
when a library or the playlists change. A kind is replaced in full.

## The search

WebSocket action `library_search` (query, context, limit, collection, genre, year range). All words must match
(`matchingStrategy: all`), typos are tolerated, and only the **last** word is a prefix: "dancing que" finds
"Dancing Queen", "danc que" does not. The word "the" is ignored.

**Context boost:** everything is searched, but when the user is on an artist or an album page the hits of that
artist or album come first. The UI sends the current context with each query.

The answer has hits per group (artists, albums, tracks, books, playlists) with the matched text marked by
the characters `HIGHLIGHT_START` and `HIGHLIGHT_END` (private use, not HTML), and facets (genres, years) for the
filter chips of the results page.

## UI

- The box in the header shows a dropdown while typing (250 ms debounce, a few hits per group) and the last
  8 searches when it is focused and empty (kept in the browser, `localStorage`).
- Enter or "Show all results" opens `/search?q=...`: up to 100 hits per group, chips for collection, genre and
  decade. The state is in the URL.
- The Audiobooks author list has its own filter field (no search service).

## Spotify in the search

When Spotify is set up (see [the player](player.md)), the same words are also searched at Spotify: its artists and
albums are added to the Artists and Albums groups and its tracks are shown as a "Spotify" group below the library's
hits, both in the dropdown and on the results page. Spotify rows carry the green SPOTIFY mark. A Spotify artist or
album opens the same pages as a local one (`/library/artist/spotify:artist:...`, `/library/album/spotify:album:...`,
see [the library](library.md)).

- WebSocket action `spotify_search` (query, offset, `types` of track, artist and album) answers a page of each and
  whether there is more (`hasMore`). Spotify answers at most 10 per request, so the results page has a "More from
  Spotify" button that asks for the next page of tracks and adds it.
- The library's hits show at once. Spotify is asked separately, 400 ms after the last letter, and its hits are added
  when they come. A search that fails or finds nothing leaves the library's hits alone.
- A Spotify track with the same artist and title as a track of the library is left out, so a track is not shown twice.
- Results page chips: **Source** (All / Local / Spotify, URL `source=`): Local does not ask Spotify, Spotify hides the
  library's hits. **Show** (Everything / Artists / Albums / Tracks, URL `type=`) filters both sources; books and
  playlists belong to no kind, so they show only under Everything. On a narrow screen only Source is shown, the other
  chips are behind the tune button.
- Spotify has no genre or decade and no audiobooks, so it is not searched while the audiobooks chip or a genre or
  decade chip is on.
- The search runs with an app token of the BFF (`AUD_SPOTIFY_CLIENT_ID` and `AUD_SPOTIFY_CLIENT_SECRET`), not with
  the account that Soloist plays as. Without them there is no Spotify group.
- The search box is part of the Meilisearch search, so **Spotify search needs Meilisearch on**: without
  `MEILI_URL` there is no box (above), and thus no Spotify search either.

## Health

The AUD health item in the header shows a `search` entry when search is configured, ok or error depending on
whether Meilisearch answers (`search_check`). It does not send e-mail alerts.

## Reindexing

Restart the BFF. If the genre or composer tags are wanted from files scanned before they were read, the cache of
the scan is rebuilt by a bump of `CACHE_VERSION` (full rescan, minutes on a Raspberry Pi).
