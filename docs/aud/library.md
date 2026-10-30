# AUD music library

The music library is built from the files of one folder, the music root. The files are the truth: the library is
kept in memory and can be rebuilt from them at any time.

## Configuration (BFF environment)

| Variable         | Required | Meaning                                                                                       |
| ---------------- | -------- | --------------------------------------------------------------------------------------------- |
| `AUD_MUSIC_ROOT` | no       | The folder with the music. Without it the library is empty.                                   |
| `AUD_AUDIOBOOK_ROOT` | no   | The folder with the audiobooks (see Audiobooks). Without it there are none.                   |
| `AUD_DATA_DIR`   | no       | Where aud keeps its data: the cache of the scan (`library.json`) and the queue (`queue.json`, see `player.md`), the playlists (`playlists.json`, see `playlists.md`) and the history (`history.json`, see `history.md`). Without it every start scans all files, and the queue, the playlists and the history are lost at a restart. |

## Folder layout

```
<music root>/Artist/Album/01 Title.mp3
<music root>/Artist/Album/Disc 1/01 Title.wma     (any depth below the album folder)
<music root>/Artist/Album/Folder.jpg              (the cover)
```

- **Artist and album** are the first two folders, not the tags. Compilations are kept together under
  `Various Artists`; the artist of a track (from its tags) is shown per track. A file higher up gets the
  placeholders "Unknown artist" and "Unknown album".
- **Tracks** are `.mp3` and `.wma` files. Everything else, such as video files or `.m3u` playlists, is ignored.
  Title, track number, disc number, year and duration come from the tags. When the tags have no title or track
  number they come from the file name (`01 - Title.mp3`); a disc number can also come from a folder named
  `Disc 1` or `CD2`.
- **Cover:** a picture in the album folder goes before one in a subfolder (such as `Artwork`). Among pictures
  of the same depth the names are tried in this order: `folder`, `cover`, `front`, names with `large`, names with
  `small`, then any other picture. Pictures named like a back, disc or inlay picture are only used when nothing
  else is there.
- **Ids** are a hash of the path below the music root, so they are the same on every machine and stay the same
  between scans.

## How it works

- `scanLibrary` (`aud-bff/src/library/library-scanner.ts`) walks the folders and reads the tags with
  `music-metadata` (pure JavaScript), three files at a time. A file with the same size and modification time as
  in the previous scan is not read again. A file whose tags cannot be read stays in the library, named after
  the file, and is logged.
- `LibraryService` keeps the artists, albums and tracks in memory and writes the scan, pretty printed so it can be read, to `library.json` in
  `AUD_DATA_DIR`. After a restart the cache is loaded at once and a scan then looks for changes in the
  background. Deleting the cache is safe.
- A scan that is running is not started a second time.

## What the UI can ask

| Action | Payload | Answer |
|--------|---------|--------|
| `library_get_artists` | none | the artists and the status (`scanning`, `scannedAt`, `trackCount`) |
| `library_get_albums` | `artistId` | the artist and its albums |
| `library_get_tracks` | `albumId` | the artist, the album and its tracks |
| `library_scan` | none | the status; a scan starts in the background if none is running |

An unknown artist or album gives `NOT_FOUND`. The cover picture of an album is served at
`GET /api/cover/music/:albumId` (or `/api/cover/audiobooks/:albumId` for a book) (needs the login cookie, cached by the browser for a day); an album without a cover gives
404 and the UI shows a record icon. The files are never served by path, only the cover the scanner picked.

The UI (`aud-ui/src/features/library`) has three views under the Library tab: the artists with a filter and a
rescan button, the albums of an artist as a cover grid, and the tracks of an album (grouped by disc when there
is more than one). While a scan runs, the artists view asks again every 3 seconds.

## What the UI keeps, and what the server tells it

The UI keeps the latest answer of every list it has asked for (artists, the albums of an artist, the tracks of an
album, the playlists), in a Redux slice (`requestCache`) by the question. A view that is opened again shows that answer at once,
without a spinner, and asks again in the background to bring it up to date; if asking fails what is shown stays.
A playlist command (rename, add, remove, move, delete) puts its answer in the cache, so the views of it do not have to ask.

The server tells the browsers when what they keep is out of date. A browser asks for these messages once, when it
connects (`content_subscribe`), and gets:

| Message | When | What the UI does |
|---------|------|------------------|
| `library_changed` | a scan found another library: a file added, removed or changed, or another cover picture. Not a scan that finds the same files, and not a restart that loads the cache. | asks again for the lists of the library that are open |
| `playlists_changed` | a playlist was made, changed or deleted (also by this browser) | asks again for the playlists that are open |
| `history_changed` | a play counted, a queue was kept, or the history was cleared (see `history.md`) | asks again for the History tab, when it is open |

Only the views that are open ask; the other cached answers are asked for again when they are opened. While a scan is running the artists
view still asks every 3 seconds, to show how many tracks have been found so far.


## Audiobooks

The audiobooks are a second library with the same scanner, kept apart from the music: its own folder
(`AUD_AUDIOBOOK_ROOT`), its own cache (`audiobooks.json`) and ids that cannot be those of a music track. The layout is
`Author/Book/Disc 01/part.mp3`, or `Author/Book/part.mp3`. A book is an album, an author is an artist and a part is a track,
so the actions are the library ones with the names `audiobook_get_authors`, `audiobook_get_books`, `audiobook_get_parts` and
`audiobook_scan`.

The parts of a book are put in order by the names of their folders and files, with numbers compared as numbers (`Disc 2`
before `Disc 10`), not by the track numbers of the tags, because the tags of audiobooks often number every part 1.

`audiobook_get_parts` also answers with `progress` (the part and the place in it) when the book has been started and not heard to
its end. The Audiobooks tab has the authors (with a button that scans again), the books of an author, and a book page with the
cover or a book icon, **Play** (or **Continue** and **Start over** when there is progress), and the parts, which can be pressed to
play from their start. Parts are named "Part 3", "Disc 2 · Part 3" when the book has several discs, or "Whole book" for one
file. A cover is `GET /api/cover/audiobooks/:albumId`. How a book is played, and its progress, is in player.md.
