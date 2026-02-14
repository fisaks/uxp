# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UXP (Unified Experience Platform) is a TypeScript monorepo that acts as a reverse proxy platform, integrating multiple remote web applications under a single UI using Shadow DOM for isolation. It manages a home environment with apps for house documentation (H2C), home automation (UHN), and a demo app.

## Common Commands

### Development
```bash
./devserver.sh start    # Start full dev environment (tmux session with all services)
./devserver.sh stop     # Stop dev environment and Docker containers
pnpm run watch          # Build shared libraries in watch mode (needed for dev)
```

### Individual Services
```bash
pnpm run start:bff          # UXP backend (Fastify on port 3001)
pnpm run start:app          # UXP frontend (Webpack dev server)
pnpm run start:h2c-bff      # H2C backend
pnpm run start:h2c-app      # H2C frontend
pnpm run start:uhn-master   # UHN home automation master service
pnpm run start:uhn-app      # UHN frontend
pnpm run start:demo-bff     # Demo backend
pnpm run start:demo-app     # Demo frontend
```

### Build & Quality
```bash
pnpm run build          # Build all packages
pnpm run clean          # Clean all dist/build dirs (run twice if devserver is on)
pnpm run lint           # ESLint across all packages
pnpm run lint:fix       # ESLint with auto-fix
pnpm run format         # Prettier format all files
pnpm run format:check   # Check formatting without writing
```

### Production
```bash
./compose.sh build      # Docker multi-stage build
./compose.sh up         # Start production stack
./compose.sh down       # Stop production stack
```

### Database (TypeORM migrations)
```bash
# Run from root with env vars loaded, or via devserver which handles this automatically
pnpm --filter @uxp/bff run typeorm:run        # Run UXP migrations
pnpm --filter @uxp/bff run typeorm:generate   # Generate migration from entity changes
pnpm --filter @h2c/bff run typeorm:run        # Run H2C migrations
./mysql.sh                                     # Direct MySQL shell access
```

### Package-level Lint
```bash
pnpm --filter @uxp/bff run lint       # Lint a specific package
pnpm --filter @uxp/ui run lint:fix    # Fix lint in a specific package
```

## Architecture

### Monorepo Layout (pnpm workspaces)

All packages live under `packages/`. Each app domain has up to three packages following a consistent pattern:

| Domain | UI (frontend) | BFF (backend) | Common (shared types) |
|--------|--------------|---------------|----------------------|
| **UXP** (platform) | `uxp-ui` | `uxp-bff` | `uxp-common` |
| **H2C** (house docs) | `h2c-ui` | `h2c-bff` | `h2c-common` |
| **UHN** (home automation) | `uhn-ui` | `uhn-master` | `uhn-common` |
| **Demo** | `demo-ui` | `demo-bff` | `demo-common` |

Cross-cutting packages:
- **`uxp-bff-common`** — Shared backend utilities (Fastify plugins, TypeORM helpers) used by all BFFs
- **`uxp-ui-lib`** — Shared React components (MUI-based, Tiptap editor) used by all UIs
- **`uxp-common`** — Types and utilities shared across the entire platform (UI + BFF + remote apps)
- **`uhn-blueprint`** — Blueprint/configuration system for UHN devices and rules
- **`uhn-rule-runtime`** — Rule execution engine with sandbox management
- **`tools`** — Build utilities (style insertion for Shadow DOM, etc.)

### Remote App Integration Pattern

UXP fetches remote app HTML via reverse proxy, rewrites resource URLs, and renders apps inside Shadow DOM containers. Remote apps receive configuration through `data-*` attributes (`data-base-url`, `data-ws-path`, `data-base-route-path`, `data-uxp-content-id`, `data-app-option`). See `docs/uxp/` for detailed architectural documentation.

### Shared Browser Globals

React, ReactDOM, Emotion, and Axios are provided as browser globals by the platform (configured in `webpack.config.base.cjs` as externals). Remote apps must not bundle these libraries. Shared libs are in `public/static/libs/` and downloaded via `./download-scripts.sh`.

### Backend Pattern (BFF)

All BFFs use Fastify 5 with TypeORM and MySQL. Source structure follows:
- `src/features/` — Domain logic grouped by feature
- `src/services/` — Business logic and external integrations
- `src/repositories/` — Data access layer
- `src/db/` — Entity definitions and migrations
- `src/config/` — Configuration
- `src/websocket/` — WebSocket handlers (where applicable)

BFFs run in dev via `tsx watch` and require environment variables from `.env.dev`.

### Frontend Pattern (UI)

All UIs use React 18, MUI 6, and Webpack 5. UXP UI additionally uses Redux Toolkit and React Router 7. CSS isolation for remote apps uses a custom style-loader insert function (`packages/tools/src/insert-function.cjs`) that targets Shadow DOM containers.

### UHN Rule Engine

The home automation system uses an MQTT-based architecture with a master-edge pattern. Rules are written in TypeScript, compiled via ts-morph, and executed in isolated Go-based sandboxes. Architecture details are in `uhn-rule-engine-architecture.md`.

## Key Configuration

- **TypeScript**: Strict mode, ES2021 target, path aliases defined in root `tsconfig.json` (e.g., `@uxp/common`, `@h2c/common`, `@uhn/blueprint`)
- **ESLint**: Flat config (ESLint 9). Separate configs for UI (`eslint.ui.config.js`), BFF (`eslint.bff.config.js`), and common (`eslint.common.config.js`) packages. `no-explicit-any` is warn, unused vars with `_` prefix are ignored.
- **Prettier**: Configured in `.prettierrc`, enforced via lint-staged + Husky pre-commit hooks
- **Environment**: `.env.template` documents all required variables. Copy to `.env.dev`/`.env.prod`. BFFs need `DATABASE_HOST`, `JWT_SECRET`, and app-specific DB credentials.

## Infrastructure

- **Docker Compose**: MySQL 8.0 (`db-server`), Mosquitto MQTT broker (`mqtt`), plus app containers
- **Nginx**: Reverse proxy for production (config in `nginx/`)
- **MQTT**: Used by UHN for device communication (dev port 2883)
- **Development requires**: Docker (for MySQL + MQTT), pnpm, Node.js 22, tmux (for devserver.sh)
