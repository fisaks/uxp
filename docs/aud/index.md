# AUD Documentation

AUD is the music remote app. It plays the music library and the audiobooks on the machine where its backend
runs (on the music Pi, into an amplifier), also plays Spotify on that output, controls the amplifier and
follows what is cast to a Chromecast. An audiobook can also be played in the browser of the phone or laptop.

These are internal notes on how it works and how it is set up. Field-level behaviour is documented in the code.

---

## How to read this documentation

Each document covers one part of the app, and the ones that need settings start with a table of the BFF
environment variables. Start with the library and the player, then go to the part you need.

---

## Documents

- [Music library](./library.md): the folder the library is built from, folder layout, audiobooks, what the UI can ask
- [Player](./player.md): the queue and the player on the house machine, Spotify on the same output, health
- [Playlists](./playlists.md): the household's shared playlists and the file they are kept in
- [History](./history.md): what counts as a play, and the queues that were replaced
- [Search](./search.md): the search box and the Meilisearch service behind it
- [Listen in the browser](./listen.md): playing an audiobook on the device that shows the page
- [Amplifier](./amplifier.md): power, volume, input, sound program and the FM tuner of the receiver
- [Chromecast](./chromecast.md): watching and controlling what is cast to a Chromecast
- [Logging](./logging.md): the log lines, and sending them to Loki

---

## See also

AUD is a remote app of the platform: how a remote app is built and loaded is described in
[the platform documentation](../uxp/index.md). The video app is described in [VID](../vid/index.md).
