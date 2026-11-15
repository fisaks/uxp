# VID Movies, TV and Kids

Besides the home videos (`library.md`) VID lists films, TV series and children's films. They are played in the
same ways (browser, player tab, Chromecast, queues, playlists, groups). Posters, overviews and ratings come from
TMDB.

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Configuration (BFF environment)

The variables of `library.md` apply. In addition:

| Variable | Required | Meaning |
|---|---|---|
| `VID_TMDB_TOKEN` | no | The TMDB read access token (themoviedb.org, Settings, API). Sent as a bearer token. Without it nothing is looked up and the items have no poster or overview. |

Set `VID_DATA_DIR` on a real host. The posters are cached in `<VID_DATA_DIR>/posters`, and without it they are
fetched again after each time the temporary folder is cleared.

## The folders

Below `VID_MEDIA_ROOT` there is one folder for each category. The BFF lists only what is in them, and expects
files a browser and a Chromecast can play (h264 and aac in `.mp4` or `.m4v`). The converter below makes them.

| Folder | Category | Layout |
|---|---|---|
| `Movies` | `movies` | `Title (Year)/Title (Year).mp4`, or a loose file |
| `KidsMovies` | `kids` | Same as `Movies`. It is a tile of its own, not a filter. |
| `TvSeries` | `tv` | `Series/Season NN/Series - SxxEyy - Title.mp4` |

- A film's title and year are read from its folder name, else from the file name. Release tags, a `-N` suffix and
  CD, Part and Disc markers are cut away. Files of the same film (`CD01`, `CD02`, `Part1`, `Part2`) are one film,
  played in order, and several files without part numbers are skipped, not guessed.
- An episode needs the `SxxEyy` marker. The series is the top folder.
- A `Sample` folder, and files that are not video or subtitles (`.rar`, `.txt`, `.jpg`), are ignored.
- The scan runs when the BFF starts. There is no rescan: restart the BFF after adding files.
- The scan result (duration, size, width, height) is cached in `VID_DATA_DIR/movie-scan.json`. ffprobe runs only for
  files that are new or changed. An empty scan is never saved, so an unmounted drive keeps the cache.
- An item's `id` is `m` and the first 16 hex characters of the SHA-1 of its category and path. The `m` tells a film
  from a home clip, whose id has no prefix, so queues, playlists and groups hold both kinds in one list of ids.
  Moving or renaming a file makes it a new item.

## Subtitles

A subtitle is a WebVTT file next to the video whose name starts with the video's name: `Film.vtt`, `Film.1.vtt`,
`Film.en.vtt`. A language code in the name gives the label ("English"), else the label is "Subtitles" (numbered
when there are several). `GET /api/movies/items/:id/subtitles/:index` returns one as `text/vtt`.

No subtitle is on by default. The browser player lists them in its own menu, and the browser's own cast button
passes them on to a Chromecast. The VID cast picker loads only the video, so a film cast from it has no
subtitles. Picture subtitles (DVD, VobSub) cannot be shown and are not converted.

## Converting

`packages/vid-bff/src/movie/convert-movies.ts` is a command line tool. It reads a source folder (such as the
drive with the originals) and writes playable files to the folder of the category. The originals are not copied
into the library, so a redo is a rerun against the source.

```
pnpm tsx src/movie/convert-movies.ts --category movies|kids|tv --source <folder> --dest <folder> \
    [--only "Mad Max"] [--original-language kor] [--dry-run]
```

- A file that is already h264 and aac is copied with `-movflags +faststart` (several audio tracks are kept).
  Everything else is encoded to h264 (CRF 20, medium) and aac. Cut films are merged into one file.
- Audio: stereo is aac at 160k, surround at 384k (up to 6 channels), 7.1 at 512k, so surround is not mixed down.
  A film with several tracks keeps the first one (taken as the original), and every track in English,
  Swedish or Finnish or with no language. `--original-language` (three letters) names the original instead, and
  makes it the default track. Use it with `--only`, as it counts for every film of the run.
- Text subtitles become WebVTT: external `.srt` and MicroDVD `.sub` files, and text tracks inside the file
  (`<name>.<language>.vtt`). Text that is not UTF-8 is read as CP1252. MicroDVD files are timed with the frame
  rate of the video, as their own header is often wrong.
- Output is written as `.partial.mp4` and renamed when finished. A rerun skips what exists. Failures are counted
  and the exit code is 1.
- `--dry-run` lists what would be done. `VERBOSE=1` prints the ffmpeg output.

A film takes a few minutes to convert, a copy takes seconds.

## TMDB

Right after the scan the BFF looks up every film and series that has no match yet, one request every 300 ms, and
stops at the first TMDB error.

- The search is in English. A match is taken only when the title is the same as the entry's title or original
  title (case, accents, punctuation and a leading "The" ignored) and the year, when the file has one, is within
  one year. An unsure match is left to the user.
- A film is searched among TMDB's films, then among its TV entries, as some films are only listed there.
  Episodes use the match of their series.
- The match is stored in `movie-tmdb.json` in the media root (not in `VID_DATA_DIR`), with the overview and the
  rating, so it is backed up with the videos and not fetched again. A not found is tried again at each start.
  A match the user cleared (`tmdbId: null`) is never looked up again.
- The poster (342 px wide) is saved in `<VID_DATA_DIR>/posters`, and fetched again when the file is missing.
- There is no automatic refresh. The **Refresh from TMDB** button on the item page fetches the entry and the
  poster again.
- **Change TMDB entry** (**Pick TMDB entry** when there is none) opens a search. Pick a candidate, or *None of
  these* to stop the lookups. Candidates show the poster straight from TMDB, and TV entries are marked.
- The rating is a number from 0 to 10 with one decimal, shown with one decimal (7.0, not 7). Without a rating
  nothing is shown.
- The list and the item pages show the TMDB logo and the attribution text above, as the TMDB terms require.

## Edits

A title or year can be edited (`PATCH /api/movies/items/:id`). Only what was edited is stored, in
`movie-metadata.json` in the media root. It is written like the labels of the home videos: debounced, atomic,
flushed on shutdown, and never written when it could not be read.

## Search

When `MEILI_URL` is set the items are indexed in `vid_movies` (title, series, year and overview, searched in that
order). The index is replaced as a whole after a scan, after the TMDB lookups, and after an edit or a changed
match. `GET /api/movies/search?q=` returns the ids, best first, or 503 when search is off or failing.

The search box in the top bar shows two sections, **Home videos** and **Films and series**. A hit in the second
opens the film page, or the series page for an episode (several episodes of a series are one hit). There is no
results page for films, only the dropdown.

## Pages

| Route (below the app's base path) | Page |
|---|---|
| `/` | The home page has a tile each for Movies, TV and Kids, with a poster mosaic and a count |
| `/movies`, `/kids` | A poster grid of the category, sorted by title |
| `/movies/items/:id`, `/kids/items/:id` | A film: poster, year, runtime, rating, overview, player, cast picker, TMDB buttons |
| `/tv` | A poster grid of the series |
| `/tv/series/:name` | A series: overview, **Play all**, and the seasons in order, each with **Play season** and its episodes |

The player on a page starts at once, has a speed button and the subtitles menu. **Play all** and **Play season**
ask for a player and queue the episodes in order (see `queues.md`). Films and episodes can be added to queues and
playlists like clips, and a queue can mix both.

## API

All routes need the login cookie unless noted. Everything is below `/api`.

| Route | Purpose |
|---|---|
| `GET /movies/items?category=` | The items, all when the category is left out |
| `GET /movies/items/:id` | One item |
| `PATCH /movies/items/:id` | Set the title or year |
| `GET /movies/items/:id/tmdb-search?q=` | TMDB candidates for the picker |
| `PUT /movies/items/:id/match` | `{tmdbId, kind?}`: pick an entry, fetch it again, or `null` for no match |
| `GET /movies/items/:id/poster` | The poster (cached for a day by the browser) |
| `GET /movies/items/:id/subtitles/:index` | A subtitle as WebVTT |
| `GET /movies/search?q=` | See above |
| `POST /movies/items/:id/stream-link` | A signed link for playing the item, see `casting.md` |
| `GET /movies/stream/:id`, `GET /movies/poster/:id` | No login, signed link, see `casting.md` |
