# VID Player Tab

The browser can be a player like a Chromecast. It is a separate browser tab with a `<video>` element, so it
can be put on another screen and made full screen. The main VID tab treats it as one more player: it has a
row in the cast bar and on the home page, a player page (`/player/player-tab`) and a row in System Center.

## Opening

The picker (clip page cast icon, Play all, the playlist Play menu) has a **Player tab** entry first in the
list. It is not the same as **This browser**, which takes a cast back to the video on the clip page.

The tab is the route `/player-window` opened by name (`vid-player`) with `?printView=true`. That query
parameter hides the UXP header and the sidebar, the same mechanism as the printing view of h2c, so VID
needs no separate page of its own. Opening it from a click means the browser allows autoplay with sound.
When the tab already exists the app sends the command and focuses the tab without reloading it. The tab has a
Home button that raises the main tab (`vid-main`) and Stop closes the tab.

## What the tab holds

- the queue `{clipIds, index, repeat}`, built with the shared edit rules (`queues.md`);
- advance on `ended`, wrap when repeating, skip a clip that fails, stop after a full round of failures;
- a stream link per clip (`casting.md`);
- the browser's native video controls (seek, volume, fullscreen) and a speed button, 0.5x to 16x.

The queue is kept per tab in `sessionStorage` (`vid-browser-player`) with the position and the paused
state, so a reload picks up where it was (autoplay may need a press on play) and closing the tab forgets it.

## Talking to the main tab

A `BroadcastChannel` (`vid-browser-player`) joins the two:

- Main to tab: `command` (`replace` with an optional start position and an optional group to follow, `next`,
  `append`, and the transport and queue commands), `ping`.
- Tab to main: `ready` (the tab is loaded, a command that waited is then delivered), `state` (clip, index,
  count, playing or paused, position, about once a second), `closed`.

`BrowserPlayerListener` in the main tab pings every 2 s and treats the tab as gone after 5 s without a
state, which also works while the tab is in the background and its timers are throttled. The state becomes a
session in the cast state with the device id `player-tab`, so all the cast UI works on it unchanged. The
tab's row disappears about 5 s after the tab is closed.

## Playing along with a group

A group can include the tab (`groups.md`). The tab then follows the group instead of leading.
