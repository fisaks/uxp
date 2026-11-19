# AUD listen in the browser

An audiobook can be listened to on the device that shows the page (a phone, a laptop) instead of on the amplifier. The book
page has a button **Listen on this device**. It opens a tab of its own with a player. The house player is not involved: its queue,
the amplifier and Spotify go on as before, and the button never starts the book on the house player.

The tab is opened with a fixed window name, so a second click finds the tab that is already open, and another book is shown in
the same tab. The address is `/listen/:albumId` with `?printView=true`, which hides the header and the side bar of the portal.

## How the tab plays

The tab plays by itself and only reports its place. A book is shown as **one continuous stream** in one `<audio>` element, and
the parts are chapters of it. Changing the source of the element at a part boundary does not work on a phone with the screen
locked (the new request stalls), but one long stream plays on through the lock.

- The player has the chapter list, a seek bar, play/pause, 30 seconds back and forward, and the speed (the pitch is kept).
- The **Media Session** shows the title and the cover in the notification and on the lock screen, with the buttons for play,
  pause and 30 seconds back and forward.
- If the stream gives an error (a dropped connection), the player asks for a new link and goes on from the same place; it does
  this at most once a minute.
- Closing the tab, or swiping it away, stops the sound. The place is saved.

## The stream

The audio is not converted. The BFF joins the files of the book, in the order of the parts, into a virtual file (see
`aud-bff/src/audiobook/book-stream.ts`): for each file it skips the ID3v2 tag at the start, the Xing/Info frame and the ID3v1
tag at the end, and the rest is laid end to end. A request with a `Range` header is answered with exactly the bytes asked for, so
the browser can seek. The start of every part in seconds is calculated from the bytes and the bitrate (not from the duration in
the library, which drifts over a long book).

A book can be streamed when **all** its parts are MP3, MPEG-1 Layer III, constant bitrate (a file with a `Xing` tag is variable
and is refused), with the same sample rate and the same number of channels. The bitrate may differ between parts. Another book
gets the error `INVALID_FILE_TYPE` ("The audiobook cannot be played in a browser") from both routes below.

### Routes

- `POST /api/audiobooks/:albumId/stream-link` (needs the login cookie) answers with `streamPath`, `query` (`exp` and `sig`),
  `expiresAt`, `parts` (`partId` and `startSec` of each part) and `totalSec`. The address of the stream is `streamPath?query`.
- `GET /api/audiobooks/stream/:albumId?exp&sig` (no cookie) streams the book, with `Range`. An `<audio>` element cannot send an
  `Authorization` header, so the link is signed instead: an HMAC of the book id and the time of
  expiry (12 hours), with a key derived from `JWT_SECRET` and the purpose `aud-stream`. A signature from another purpose (such as the
  one of VID), for another book, or one that has expired, gives 403. The signing is shared with VID in
  `uxp-bff-common/src/stream/`.

## Progress

The place of the browser listener is kept **for each user**, separate from the household place of the amplifier (`book-progress.json`,
see `player.md`). The browser never writes the household place, and the amplifier never writes the place of a user.

- It is saved in `book-progress-users.json` in `AUD_DATA_DIR`: user, book, `partId`, `positionSec`, `updatedAt`.
- The tab saves every 15 seconds, on pause, on seek, on a change of part and when the page is hidden (`pagehide`), with the WS
  action `audiobook_save_user_progress` (`albumId`, `partId`, `positionSec`; the part must belong to the book). A book heard to its
  end is forgotten with `audiobook_clear_user_progress`.
- `audiobook_get_parts` answers with `userProgress` next to `progress`. The first time a user listens to a book in the browser it
  starts at the household place; after that at the own place. It always starts 15 seconds before the saved place (not before the
  start of the part).
- The Continue tiles and the history show the household place only; listening in the browser is not shown there.
- Two tabs on the same book are not guarded: the last to save wins.

## Through the proxies

```
browser -> uxp-web-pub -> uxp-bff (/api/content/resource/aud/...) -> uxp-web-remote (/aud/api/) -> aud-bff on the Pi
```

`Range` goes through every hop. uxp-bff forwards the headers and streams the answer. In `uxp-web-remote` the stream goes through
`/aud/api/`; the Pi 3 serves up to 260 MB per book, so the stream is not buffered there.
