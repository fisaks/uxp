# AUD logging

`aud-bff` writes one JSON line per message (the Fastify logger, `LOG_LEVEL` sets the level, `info` by default) to the
standard output. Where that goes is up to how it is run: the terminal in development, a log file or the journal
under systemd.

## Sending the lines to Loki

With `AUD_LOKI_URL` set (the base URL of a Loki, for example `http://loki-host:3100`) the same lines are also sent to
Loki, so they can be searched next to the logs of the other services.

| Setting | Meaning |
|---------|---------|
| `AUD_LOKI_URL` | Base URL of Loki. Without it nothing is sent. |

- The service sends the lines itself with `POST /loki/api/v1/push`, in batches (every 5 seconds, or at once when 200
  lines are waiting). It needs no agent such as Promtail, which matters on a small machine.
- The labels are `container="aud-bff"`, `stream="stdout"` and `host=<the host name>`: the labels that the container
  logs of a Docker setup have, so one query, `{container="aud-bff"}`, works the same way. The time of a line is the
  `time` of its JSON.
- Loki never gets in the way of the service. A failed send is tried again with the next batch, and while Loki cannot be
  reached at most the newest 2000 lines are kept in memory, the older ones are dropped. A warning about it goes to the
  standard error, once a minute at most, and is not sent to Loki itself. When the service is stopped it sends what
  is waiting.

## What is logged at which level

`LOG_LEVEL` is `info` in normal running, so only what is worth reading is logged. Set it to `debug` to see the rest.

- **info:** the service starting and listening, the library scan, every track the player starts, every action a
  browser asks for (`Processing WebSocket action`), and a browser connecting and disconnecting.
- **warn and error:** a file that cannot be played (with the last lines mplayer printed), a failed scan, a failed
  send to Loki.
- **debug:** the messages sent to clients (the player sends one every 2 seconds while playing), the list of handlers and
  routes that is printed at every start, the ping lines of the WebSocket, and the request lines of Fastify (two per
  request, which is a lot when a page loads many covers).

The messages of the WebSocket and the routes are logged by `uxp-bff-common`, which the other services use too, so
they are at the same level there.
