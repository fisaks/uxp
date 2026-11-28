# VID Documentation

VID is the video remote app. It lists the home videos, films, TV series and children's films of a media folder,
and plays them in the browser, in a separate player tab, or on Chromecasts, alone or in groups, from queues and
playlists. Videos can be sent to the library from a phone.

These are internal notes on how it works and how it is set up. Field-level behaviour is documented in the code.

---

## How to read this documentation

Start with the home video library, which has the settings every other page relies on, then the films and series.
The documents on casting, queues, groups and the player tab describe the ways a video is played and apply to
home videos and films alike.

---

## Documents

- [Home video library](./library.md): the media folder, settings, labels, poster frames, search and the pages
- [Movies, TV and Kids](./movies.md): films and series, the converter, TMDB, subtitles and audio tracks
- [Upload from a phone](./upload.md): sending home videos in chunks, and converting them
- [Casting](./casting.md): stream links, Chromecast sessions, subtitles and audio on a TV, the Chromecasts page, Philips TV power
- [Queues and playlists](./queues.md): the players, their queues, and saved playlists
- [Cast groups](./groups.md): several Chromecasts playing the same video in step
- [Player tab](./player-tab.md): the browser as a player in a tab of its own

---

## See also

VID is a remote app of the platform: how a remote app is built and loaded is described in
[the platform documentation](../uxp/index.md). The music app is described in [AUD](../aud/index.md).
