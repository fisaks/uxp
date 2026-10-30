# AUD history

The history is what was played and the queues that were replaced. It is shared by everyone who uses the app, kept in memory and in
`history.json` in `AUD_DATA_DIR` (without it only until the next restart), and written at once after every change.

## What counts

- **A play** is a track that has been *listened to* for 30 seconds, or for half of it when it is shorter than a minute. The
  player adds up the time between its position reports while the track plays: a pause is not counted, and neither is
  a gap longer than 2 seconds (a stall), and seeking ahead does not give credit. A track counts once each time
  it is played, so with repeat one every time round counts. Skipping a track before the time counts nothing.
- **An audiobook** is one entry, however many of its parts were heard: it is recorded when a part has been listened to for
  the same time, and listening to it again takes the earlier entry away and puts it at the top with the new time. The queue
  of a book is not kept as a previous queue, Continue on the book page is how it is taken up again.
- **A previous queue** is the queue that was taken away when it was replaced (an album, a playlist, a track played from
  the history) or cleared. A queue of one track is not kept, nor is a queue that is the same as the latest one kept.
  The last 10 are kept. Taking a track off the queue or moving it does not keep anything.

## The file

```json
{
  "plays": [{ "id": "619f58111f62b769", "name": "Abba - Super Trouper", "playedAt": "2026-10-30T18:15:02.114Z" }],
  "queues": [
    {
      "id": "a3f3634f-8d90-4484-a4bd-09fa64dcd257",
      "replacedAt": "2026-10-30T18:10:00.000Z",
      "currentIndex": 2,
      "tracks": [{ "id": "619f58111f62b769", "name": "Abba - Super Trouper" }]
    }
  ]
}
```

The newest is first. Up to 1000 plays are kept. An audiobook has `"book": true` and the id of the book.
 A track is its library id and a name "Artist - Title": the id counts, and the
name is for whoever reads the file and for a track that has gone from the library (it is then shown as missing and
skipped when a queue is played again). A damaged file gives an empty history, and entries of the wrong shape are skipped.

## What the UI can ask

| Action | Answer |
|--------|--------|
| `history_get` | the latest 300 plays (newest first, with the track when it is in the library), how many are kept, and the previous queues |
| `history_clear` | the same, empty: both the plays and the previous queues are forgotten |

The server pushes `history_changed` when a play has counted, a queue has been kept or the history was cleared, so an open
History tab is brought up to date (see `library.md`).

## The History tab

- **Previous queues:** each one with its number of tracks, when it was replaced and the first names, with Play (the
  tracks that are still in the library become the queue again, starting with the track that was current, and Undo is
  offered as for any replaced queue) and a button to save it as a playlist.
- **Played:** the plays in a group for each day ("Today", "Yesterday", then the date in the Finnish form, such as `ti 27.10.`, with the year when it is another year) with the time as `09:05` (24 hour clock). Pressing a track plays it: when
  there is a queue it is played now and the queue is kept, otherwise it is played alone. The + puts it in the queue.
- **Clear** (with a question first) forgets both.
