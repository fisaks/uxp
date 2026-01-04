# WebSocket Proxying

This document describes how WebSocket traffic flows between the **browser**, **UXP**, and a **remote app**, and how the proxy is set up and kept healthy (auth, ping/pong, reconnection, and logout cleanup).

---

## High-level architecture

A remote app never exposes its WebSocket directly to the browser.

Instead, the browser connects to UXP:

```
Browser ──WS──▶ UXP: /ws-api/:appIdentifier ──WS──▶ Remote app: baseUrl + contextPath + wsPath
```

UXP acts as a **bidirectional WebSocket proxy**:
- forwards messages in both directions
- performs optional authentication gating
- keeps the connections alive with ping/pong
- attempts to reconnect to the remote app if the upstream WS drops
- closes client sockets when the user logs out (session-based cleanup)

---

## Endpoints and URL building

### Browser-facing endpoint (UXP)

UXP exposes a WebSocket endpoint:

- `GET /ws-api/:appid` (Fastify WebSocket route)

This is the **only** URL the browser needs.

### Upstream endpoint (remote app)

UXP connects to the remote app WebSocket by constructing:

```
buildPath(app.baseUrl, app.config.contextPath, app.config.wsPath ?? "/ws-api")
```

So the upstream URL is effectively:

```
baseUrl + contextPath + (wsPath or "/ws-api")
```

---

## Connection setup in UXP

When a client connects to `GET /ws-api/:appid`, UXP does:

1. **Resolve the app**
   - Reads `appid` from route params
   - Looks up the remote app from the database (`AppEntity`)
   - If not found → send an error message and close the socket.

2. **Authenticate (optional)**
   - If the request contains the access token cookie, UXP calls `request.jwtVerify()`.
   - On success, `request.user` is available as a `Token`.

3. **Enforce public/private WS access**
   - If the user is unauthenticated and the app is **not** configured as public (`!app.config.wsPublic`)
     → UXP sends `UNAUTHORIZED` and closes.
   - If `wsPublic` is enabled, guests can connect.

4. **Connect to the remote app WebSocket**
   - UXP opens its own WS client connection to the remote app.
   - It forwards some request context via headers:
     - `cookie` (so the remote app can verify the same auth token)
     - `user-agent`
     - `x-forwarded-for` (appends the real IP to any existing chain)

5. **Register the client socket under the session**
   - If `user.sessionId` exists, UXP stores `clientSocket` under:
     - `activeSessions: Map<sessionId, Set<WebSocket>>`
   - This enables logout cleanup (closing all sockets in the session).

6. **Start the proxy**
   - UXP calls `setupWebSocketProxy(clientSocket, remoteSocket, request, app)`.

---

## Bidirectional message forwarding

Once proxying starts, UXP attaches message listeners:

- **client → remote**
- **remote → client**

Forwarding preserves the “binary vs text” distinction:

- If `isBinary === true`, the raw frame is forwarded as-is.
- Otherwise, the message is forwarded as a string.

This proxy layer does not interpret application payloads. It forwards frames.

---

## Health monitoring with ping/pong

### UXP ping policy

UXP runs a ping loop on **both sockets**:

- `PING_INTERVAL = 30000` (30s)
- For each socket:
  - send `ping()`
  - wait up to `PONG_TIMEOUT = 10000` (10s)
  - if no pong arrives → close that socket

This detects dead connections quickly and forces a teardown/reconnect path.

### Remote app ping policy (and why it differs)

The remote app WebSocket handler also sets up its own ping/pong logic, but with a slightly longer cadence:

- `PING_INTERVAL = 45000` (45 seconds)

Key behavior:

- If the remote app **receives a ping from the client side (UXP)**,  
  it **stops sending its own automatic pings**.
- From that point on, UXP becomes the primary liveness driver for the connection.

This avoids *dueling ping loops* between UXP and the remote app and ensures that
only one side actively controls connection health when running inside UXP.

Importantly, this logic also enables **standalone operation**:

- When the remote app is run **without UXP**, no external pings are received
- The remote app continues sending its own pings
- Ping/pong liveness monitoring still works correctly

This adaptive behavior allows the same WebSocket implementation to function
both:
- behind the UXP WebSocket proxy, and
- when the app is accessed directly, without special-case code.
---

## Remote app disconnect + automatic upstream reconnection

If the remote app WS closes unexpectedly, UXP:

1. Stops forwarding messages temporarily.
2. Notifies the browser (via the same client socket) using a control message:

- action: `uxp/remote_connection`
- error code: `DISCONNECTED`

3. Attempts to reconnect to the remote app:
   - up to `MAX_RECONNECT_ATTEMPTS = 5`
   - with increasing delays (`RETRY_DELAY * attempt`)

4. If reconnect succeeds:
   - UXP sends a success `uxp/remote_connection` message
   - swaps in the new remote socket
   - rebinds message forwarding
   - resumes proxying

5. If reconnect fails:
   - UXP closes the client socket

This means the browser connection can stay alive while UXP recovers the upstream connection.

---

## Browser-side behavior during proxy reconnects

On the browser side, the `BrowserWebSocketManager` reacts to connection changes:

- If the WS closes abnormally (not code `1000`), it schedules reconnection with exponential backoff.
- It also listens for the `uxp/remote_connection` action:
  - if it receives a failure with `DISCONNECTED` → it can surface “remote recovering”
  - if it receives a success → it can surface “remote up”

This creates a two-layer resilience model:

- **Browser** reconnects when the UXP socket itself drops
- **UXP** reconnects when only the upstream remote socket drops

---

## Authentication and authorization on the remote app

The remote app’s `registerLocalWebSocketHandlers`:

- extracts and verifies the access token from the `ACCESS_TOKEN` cookie
- stores `{ socket, user, requestMeta }` in a `GenericServerWebSocketManager`
- dispatches messages by `action` using a preloaded handler map

Each action can declare:
- whether authentication is required
- which roles are required
- optional payload validation (custom validate or AJV schema)
- optional QueryRunner usage for DB operations

So even if the proxy allows a connection, **the remote app still enforces action-level security**.

---

## Message format support: string and binary

Both ends support:

### String messages
JSON objects like:

- `{ action, id?, payload }`

### Binary messages
Frames that begin with a magic prefix (`MAGIC_BINARY_PREFIX`) followed by:

- a header length
- JSON header (action/id/payload)
- remaining bytes as binary payload

The remote app parses this and passes binary payload separately to handlers.
The browser does the symmetric parsing and dispatch.

UXP forwards frames transparently (it does not parse them).

---

## Logout cleanup (closing WS on session end)

UXP tracks active client sockets by `sessionId`.

When a user logs out, UXP can call:

- `closeAllActiveWebSockets(sessionId)`

This:
- closes all sockets associated with that session
- removes the session entry from the map

This prevents “zombie” WebSockets from living forever after logout.

---

## Setup checklist

To enable WS proxying for a remote app:

1. **UXP must have the app configured**
   - `AppEntity.baseUrl`
   - `app.config.contextPath`
   - `app.config.wsPath` (optional; defaults to `/ws-api`)
   - `app.config.wsPublic` (optional; allow guests)

2. **Remote app must expose a WS server**
   - typically mounted at `/ws-api` under its context path
   - must accept cookies for auth (same token cookie forwarded by UXP)

3. **Browser must connect via UXP**
   - URL: `/ws-api/:appIdentifier`
   - remote apps should derive that from config (`data-ws-path` rewritten by UXP)

---

## Notes and intentional design choices

- **Proxy is “dumb” by design:** UXP does not interpret app actions; it only forwards frames.
- **Resilience is layered:** UXP handles upstream reconnect; browser handles portal reconnect.
- **Security is layered:** UXP can gate guest access; remote app enforces per-action auth/roles.
- **Keepalive is centralized:** UXP pings both sockets; remote app backs off if UXP is pinging.

---

## Codes
- [UXP WebSocket Handler](https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/uxp-bff/src/websocket/registerRemoteWebSocketHandler.ts)
- [Remote App WebSocket Handler](https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/uxp-bff-common/src/websocket/registerLocalWebSocketHandlers.ts)
- [Browser WebSocket Handler](https://github.com/fisaks/uxp/blob/22b291d2bfac4a3580fcf8feca614e0258a46e37/packages/uxp-ui-lib/src/features/websocket/BrowserWebSocketManager.ts)