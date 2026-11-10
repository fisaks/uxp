# VID Queues and Playlists

## Players and queues

A **player** is a Chromecast, a group of Chromecasts (`groups.md`) or the player tab (`player-tab.md`). Each
player has its own queue `{clipIds, index, repeat}`. Casting one clip is a queue of one. Without repeat the queue
stops after the last clip; with repeat it starts again from the first.

- A queue of a Chromecast or a group lives in the BFF, so playback continues without a browser. It is kept in
  `cast-queues.json` in `VID_DATA_DIR` and survives a restart. After a restart a running cast keeps its queue
  when the clip that plays is the queue's current clip, otherwise it becomes a queue of one.
- The queue of the player tab lives in that tab (`player-tab.md`).
- At the natural end of a clip the next one starts. A stop by the user or by the receiver is not an advance and
  clears the queue. A clip that fails is skipped, and after a full round of failures the queue is cleared, so
  repeat cannot loop forever. A clip that has left the library is skipped.
- The queue edit rules are shared code (`vid-common/src/queue/queue-edit.ts`), used by the BFF and by the tab.

`POST /api/cast/players/:id/queue` takes one action:

| Action | Meaning |
|---|---|
| `replace` | Play these clips from an index (and a position). Keeps the repeat flag |
| `next` | Insert after the current clip |
| `append` | Add at the end |
| `remove`, `move`, `jump` | By index |
| `repeat` | Set the flag |

A bad index is a 400 `VALIDATION`. `POST /api/cast/sessions/:id/next` skips to the next clip.

## In the UI

- Clip page and Play all (the home video list, for the clips shown, in timeline order): choose a player.
  If the player already plays something, choose **Play now**, **Play next** or **Add to queue**. A short banner
  above the cast bar confirms.
- The player page shows the poster, transport, position, speed, a queue list (drag to reorder, click to jump,
  remove, open the clip page) and Repeat.

## Playlists

A playlist is a named list of clip ids, stored in `HomeVideos/playlists.json` in the media root, next to the labels
and with the same writer rules (debounced, atomic, never saved when the file could not be read).

- A playlist is created only by **Save as playlist** in the queue header of a player page, which asks for a
  name. A name is unique, ignoring case. Saving under a taken name asks to **Replace** it, and the request
  then carries `replace: true`, a guard against a stale list.
- Only the clip ids are saved, not the repeat flag. A clip that is gone is skipped when playing and greyed
  on the playlist page.
- To change a playlist, play it, edit the queue and save under the same name.
- The Playlists page has cards with Play (on a player), Rename and Delete.

| Route | Purpose |
|---|---|
| `GET /playlists` | The list |
| `POST /playlists {name, deviceId \| clipIds, replace?}` | Save a Chromecast's queue, or a list of clips (the player tab) |
| `PATCH /playlists/:id {name}`, `DELETE /playlists/:id` | Rename, delete |

Every call answers with the full list. A name that is taken is 409, no queue to save 404, and 503 when the
file cannot be written.
