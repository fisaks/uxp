# UXP Deployment Guide

How to deploy a UXP-based platform with one or more remote applications. This is a reference architecture — not a prescription. Everything here can run natively without Docker, in containers on a single machine, or distributed across a swarm of small computers. Skip services you don't need, merge what makes sense for your scale, and adapt the topology to your hardware.

## How Request Routing Works

Understanding the request flow is key to understanding why each service exists.

**Static assets and API routing:**

```
Browser
  │
  ├── GET /                    ──► web-pub serves the UXP SPA bundle
  │                                (React app baked into the web-pub image)
  │
  ├── GET /api/*               ──► web-pub proxies to uxp-bff
  │                                (auth, navigation, config, remote app content)
  │
  ├── GET /ws-api/*            ──► web-pub proxies WebSocket to uxp-bff
  │
  └── (no direct browser       ──► web-remote is internal only —
       access to web-remote)        uxp-bff fetches from it, not the browser
```

**Remote app loading flow:**

When a user navigates to a page that contains a remote app:

```
1. Browser requests page content from uxp-bff:
   GET /api/content/index/:uuid

2. uxp-bff looks up the app in its database:
   AppEntity { baseUrl: "http://web-remote", contextPath: "/myapp" }

3. uxp-bff fetches the app's entry HTML from web-remote:
   GET http://web-remote/myapp/index.html

4. uxp-bff rewrites asset URLs in the HTML so they route back through itself:
   <script src="/app.js">  →  <script src="/api/content/resource/myapp/app.js">

5. Browser receives rewritten HTML, renders it in a Shadow DOM container

6. When the browser requests rewritten asset URLs:
   GET /api/content/resource/myapp/app.js
   → web-pub proxies to uxp-bff
   → uxp-bff proxies to http://web-remote/myapp/app.js
```

**App API and WebSocket routing:**

```
web-remote nginx has per-app location blocks:

  /myapp/          → serves static files (JS/CSS bundles)
  /myapp/api/*     → proxies to the app's BFF container
  /myapp/ws-api    → proxies WebSocket to the app's BFF container

So app API calls flow:
  Browser → web-pub → uxp-bff → web-remote → app BFF

And WebSocket connections:
  Browser → web-pub (/ws-api/myapp) → uxp-bff → web-remote (/myapp/ws-api) → app BFF
```

This means **uxp-bff never needs to know about individual app BFF containers** — it only knows `http://web-remote` as the base URL. The web-remote nginx config maps each app's context path to its BFF.

## Infrastructure Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  UXP Platform Services                                                  │
│                                                                         │
│  :443/:80                                                               │
│  ┌──────────────┐    /api/*, /ws-api/*    ┌──────────┐                  │
│  │  web-pub     │ ──────────────────────► │ uxp-bff  │                  │
│  │  (nginx)     │                         │ (Fastify)│                  │
│  │              │                         └────┬─────┘                  │
│  │ - HTTPS term.│                              │                        │
│  │ - UXP SPA    │   /api/content/resource/*    │    ┌────────┐          │
│  │ bundle       │                              ├───►│   DB   │          │
│  └──────────────┘                              │    └────────┘          │
│                                                │                        │
│                               fetch app HTML   │                        │
│  ┌──────────┐                + proxy assets    │                        │
│  │ certbot  │                                  ▼                        │
│  │(optional)│                           ┌──────────────┐                │
│  └──────────┘                           │  web-remote  │                │
│                                         │  (nginx)     │                │
│                           ┌──────────┐  │ /app1/       │                │
│                           │   MQTT   │  │ /app2/       │                │
│                           │  broker  │  │   SPA bundles│                │
│                           └──────────┘  │   /api/* ────┼───────┐        │
│                                         │   /ws-api/* ─┼───────┤        │
│                                         └──────────────┘       │        │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                             │        │
│  │ Promtail → Loki → Grafana       │  Monitoring (opt.)        │        │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                             │        │
└────────────────────────────────────────────────────────────────┼────────┘
                                                                 │
                    ┌────────────────┬───────────────┬───────────┘
                    ▼                ▼               ▼
┌──────────────────────┐  ┌──────────────┐  ┌──────────────┐
│  App BFF (any app)   │  │  App BFF     │  │  UHN         │  ...
│  e.g. H2C            │  │  e.g. Cam    │  │  Master      │
│                      │  │              │  │              │
│  DB, REST, WS        │  │  DB, REST, WS│  │  DB, REST, WS│
│                      │  │              │  │  + MQTT      │
└──────────────────────┘  └──────────────┘  └──────────────┘
                                                   ▲
┌──────────────────────────────────────────────────┼──┐
│  UHN Edge (1-n)                                  │  │
│                                                  │  │
│  ┌────────────────┐                              │  │
│  │  MQTT broker   │                              │  │
│  │  (own or use   │◄─────────────────────────────┘  │
│  │   UXP's)       │                                 │
│  └───────┬────────┘                                 │
│          │                                          │
│  ┌───────┴──────┐                                   │
│  │  UHN Edge    │                                   │
│  │  Process     │                                   │
│  │  (Go)        │                                   │
│  └──────┬───────┘                                   │
│         │                                           │
│         ├── Serial (Modbus, RS485, ...)             │
│         ├── LAN (SOAP, UDP, TCP, ...)               │
│         └── MQTT (device bridges like Z2M, ...)     │
└─────────────────────────────────────────────────────┘
```

## Services

### web-pub (nginx)

The public-facing entry point. Serves the UXP SPA bundle (React app baked into the image) and reverse-proxies `/api/*` and `/ws-api/*` to the BFF. Handles TLS termination. HTTPS is effectively required — modern browsers restrict access to cameras, microphones, speakers, and other device APIs on non-secure origins.

**Why its own container:** It serves static files (the UXP SPA bundle) and terminates TLS — both are nginx concerns, not Node.js concerns. Keeps the BFF focused on application logic.

### uxp-bff (Node.js / Fastify)

The platform backend. Handles authentication (JWT), user management, session management, platform configuration (apps, routes, pages), and the navigation API. Acts as the reverse proxy for remote app content — fetches HTML from web-remote, rewrites asset URLs, and proxies subsequent asset and WebSocket requests.

Apps, routes, and pages are registered in the database. The `/api/navigation` endpoint returns the full navigation structure filtered by the current user's roles, which the UXP SPA bundle uses to build its routes.

**Why its own container:** It's the shared platform layer. Provides the runtime shell (navigation, routing, app loading), authentication, and content proxying for all remote apps — none of which implement these themselves.

### web-remote (nginx)

An internal nginx that serves all remote app UI bundles and proxies each app's API/WebSocket traffic to its BFF container. Each app gets location blocks under its context path (e.g. `/myapp/` for static files, `/myapp/api/` proxied to the app's BFF).

**Why its own container:** Consolidates all remote app routing in one place. The BFF only needs to know one base URL (`http://web-remote`) regardless of how many apps exist. Adding a new app means adding its static files and a few nginx location blocks — no changes to the platform BFF or web-pub.

### Database (MySQL)

Stores platform data (users, routes, pages, app registrations) and app-specific data. Each app BFF can have its own schema on the shared instance.

**Why its own container:** Provides relational storage for the platform and any remote app that needs it.

### MQTT Broker (Mosquitto)

Pub/sub message bus available to any remote app that needs it. How it's used depends entirely on the app — UHN uses MQTT for edge-to-master device communication, another app might use it for event streaming or not at all. The UXP platform itself does not use MQTT for anything — it is purely a shared service for apps.

**Why its own container:** The broker must be reachable by any service that needs it. Running it separately makes it independently restartable and configurable.

### App BFF (one per app)

Each remote application has its own backend container with its own domain logic. For example: a home automation app that orchestrates lighting and sensors, an HVAC/climate control app that manages heating circuits and schedules, a security camera app that handles streams and motion events, or an energy monitoring app that tracks solar and consumption data.

An app BFF typically:
- Exposes REST API and WebSocket endpoints that web-remote proxies to
- Has its own database tables (or schema) on the shared MySQL instance
- May use the MQTT broker, the database, both, or neither

**Why per-app containers:** Domain isolation. Each app has independent deployments, restarts, and resource limits. A crash in one app doesn't affect others.

### App-Specific Services

Some apps bring their own additional services beyond a BFF. These are not platform concerns — they are part of that app's architecture.

For example, UHN (home automation) uses **edge processes** that run on hardware near physical devices, communicating with the UHN master via MQTT, and **device bridges** like Zigbee2MQTT that expose devices as MQTT topics. H2C (building documentation) has no such services — it's a purely centralized app with just a BFF and database.

### Certbot (optional)

Automated Let's Encrypt certificate renewal. Shares a volume with web-pub for certificates. Not needed if TLS is terminated elsewhere or not used.

### Monitoring Stack (optional)

Promtail ships container logs to Loki. Grafana provides a query UI. Useful for multi-container setups; overkill for development.

## Deployment Flexibility

This architecture scales both up and down.

**Development / native:**
App processes (BFFs, UIs) run natively via `devserver.sh` in a tmux session. Shared infrastructure (DB, MQTT, dev HTTPS proxy) runs in Docker via `docker compose`. No production nginx or certbot — a dev HTTPS proxy provides TLS locally, which is needed for full device API access (camera, mic, etc.) when testing on mobile devices.

**Single server:**
Everything in one Docker Compose file. This is the typical small deployment. Apps that need LAN access to physical devices (like UHN) can run their services on the same host with `network_mode: host`.

**Distributed:**
UXP platform services and app BFFs can run on the same hardware or on separate machines exposed over the LAN — the platform doesn't care.

## Example: Docker Compose

A single-server deployment with one domain app and optional monitoring. Adapt to your needs

```yaml
services:
    # --- Infrastructure ---

    mqtt:
        image: eclipse-mosquitto:2
        container_name: mqtt
        restart: unless-stopped
        ports: ["1883:1883"]
        volumes:
            - ./mosquitto/config:/mosquitto/config:ro
            - mosquitto_data:/mosquitto/data
        networks: [platform]

    db:
        image: mysql:8.0
        container_name: db
        restart: unless-stopped
        environment:
            MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
        volumes:
            - db_data:/var/lib/mysql
            - ./database/:/docker-entrypoint-initdb.d/
        healthcheck:
            test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
            interval: 10s
            timeout: 5s
            retries: 5
        networks: [platform]

    # --- Platform ---

    uxp-bff:
        image: my-registry/uxp-bff:latest
        container_name: uxp-bff
        restart: unless-stopped
        env_file: [.env]
        depends_on:
            db: { condition: service_healthy }
        healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
            interval: 10s
            timeout: 5s
            retries: 3
        networks: [platform]

    web-pub:
        image: my-registry/web-pub:latest
        container_name: web-pub
        restart: unless-stopped
        depends_on: [uxp-bff]
        ports:
            - "80:80"
            - "443:443"
        volumes:
            - ./nginx/ssl.conf:/etc/nginx/ssl.conf:ro
            - ./nginx/entrypoint.sh:/entrypoint.sh:ro
            - certbot_webroot:/var/www/certbot:ro
            - certbot_certs:/etc/letsencrypt:ro
        entrypoint: ["/entrypoint.sh"]
        networks: [platform]

    certbot:
        image: certbot/certbot
        container_name: certbot
        restart: unless-stopped
        volumes:
            - certbot_webroot:/var/www/certbot
            - certbot_certs:/etc/letsencrypt
        entrypoint: >
            /bin/sh -c 'trap exit TERM;
            while :; do certbot renew --webroot -w /var/www/certbot --quiet;
            sleep 12h & wait $${!}; done'
        depends_on: [web-pub]
        networks: [platform]

    web-remote:
        image: my-registry/web-remote:latest
        container_name: web-remote
        restart: unless-stopped
        volumes:
            - ./web-remote/nginx.conf:/etc/nginx/conf.d/default.conf:ro
        depends_on: [app-bff]
        networks: [platform]

    # --- Remote App ---
    # Each app adds one BFF container.
    # Its UI bundle is baked into the web-remote image.
    # Its API/WS routes are defined in web-remote's nginx config.
    # Any additional services the app needs (edge nodes, device bridges,
    # workers, etc.) are the app's own concern — add them as needed.

    app-bff:
        image: my-registry/app-bff:latest
        container_name: app-bff
        restart: unless-stopped
        env_file: [.env]
        depends_on:
            db: { condition: service_healthy }
        healthcheck:
            test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
            interval: 10s
            timeout: 5s
            retries: 3
        networks: [platform]

    # --- Monitoring (optional) ---

    loki:
        image: grafana/loki:3.4
        container_name: loki
        restart: unless-stopped
        ports: ["3100:3100"]
        volumes:
            - ./loki/config.yml:/etc/loki/local-config.yaml:ro
            - loki_data:/loki
        command: -config.file=/etc/loki/local-config.yaml
        networks: [platform]

    promtail:
        image: grafana/promtail:3.4
        container_name: promtail
        restart: unless-stopped
        volumes:
            - ./promtail/config.yml:/etc/promtail/config.yml:ro
            - /var/lib/docker/containers:/var/lib/docker/containers:ro
            - /var/run/docker.sock:/var/run/docker.sock:ro
        command: -config.file=/etc/promtail/config.yml
        depends_on: [loki]
        networks: [platform]

    grafana:
        image: grafana/grafana:11
        container_name: grafana
        restart: unless-stopped
        ports: ["3000:3000"]
        environment:
            - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
            - GF_AUTH_ANONYMOUS_ENABLED=false
        volumes:
            - grafana_data:/var/lib/grafana
            - ./grafana/datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro
        depends_on: [loki]
        networks: [platform]

volumes:
    db_data:
    mosquitto_data:
    certbot_webroot:
    certbot_certs:
    loki_data:
    grafana_data:

networks:
    platform:
        driver: bridge
```

### Adding a New Remote App

To add a second domain application (e.g. `another-bff`):

1. **Add a BFF container** to the compose file
2. **Add the app's UI build output** to the web-remote image (built into `/usr/share/nginx/html/another/`)
3. **Add nginx location blocks** in web-remote's config:
    ```nginx
    # Static assets
    location /another/ {
        alias /usr/share/nginx/html/another/;
        index index.html;
    }

    # API proxy to the app's BFF
    location /another/api/ {
        set $another_bff http://another-bff:3028;
        rewrite ^/another/api/(.*) /api/$1 break;
        proxy_pass $another_bff;
        proxy_set_header Host $host;
    }

    # WebSocket proxy to the app's BFF
    location /another/ws-api {
        set $another_bff http://another-bff:3028;
        rewrite ^/another/ws-api(.*) /ws-api$1 break;
        proxy_pass $another_bff;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
    ```
4. **Register the app** in the platform config database with `baseUrl: "http://web-remote"` and `contextPath: "/another"`. See `packages/uxp-config-dev/src/uxp.dev.config.ts` for an example of how apps, routes, and pages are defined using `defineConfig()`. For details on how the platform config system works, see [Platform Config](../uxp/platform-config.md).

### Notes

**App-specific networking:** Remote apps may have their own infrastructure requirements beyond the platform. For example, UHN runs edge processes with `network_mode: host` for direct LAN access to physical devices over serial, UDP, and SOAP. Other apps may need none of this.

**Service authentication:** Infrastructure services (MQTT broker, database, monitoring) can be configured however you see fit, but enabling some form of authentication is recommended for each.

**TLS termination:** web-pub terminates HTTPS so that no other service inside UXP needs to handle certificates. HTTPS is effectively always required — browsers restrict device APIs (camera, mic, speaker, etc.) on non-secure origins, even on LAN-only deployments. Internal communication between services uses plain HTTP/MQTT on the Docker bridge network.

**Docker registry:** The example uses `my-registry/` as an image prefix placeholder. In practice this could be Docker Hub, GitHub Container Registry, or a private registry. You can also add a local registry to the compose file:
```yaml
registry:
    image: registry:2
    container_name: registry
    restart: unless-stopped
    ports: ["127.0.0.1:5000:5000"]
    volumes:
        - registry_data:/var/lib/registry
    networks: [platform]
```
Binding to `127.0.0.1` keeps it off the network. Push images from a dev machine via an SSH tunnel (`ssh -L 5000:localhost:5000 user@server`), then reference them as `localhost:5000/my-image:latest` in the compose file.

**web-remote nginx config is mounted at runtime** — not baked into the image. This allows updating routing (adding new apps) without rebuilding the image.

**Volume-mounted configs require container restarts.** Services like
`uhn-edge1`, `uhn-master`, and `uxp-bff` read their config at startup
from volume-mounted files. `docker compose up -d` only recreates
containers whose image changed — it does not restart containers that
only had config file changes on the host. The deploy script should
explicitly restart these services after syncing config files.
