# Stage 1: Build the entire monorepo
FROM node:22 AS builder

RUN npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy each package.json individually (Docker ** glob doesn't preserve directories)
COPY packages/demo-bff/package.json ./packages/demo-bff/
COPY packages/demo-common/package.json ./packages/demo-common/
COPY packages/demo-ui/package.json ./packages/demo-ui/
COPY packages/h2c-bff/package.json ./packages/h2c-bff/
COPY packages/h2c-common/package.json ./packages/h2c-common/
COPY packages/h2c-ui/package.json ./packages/h2c-ui/
COPY packages/tools/package.json ./packages/tools/
COPY packages/uhn-blueprint/package.json ./packages/uhn-blueprint/
COPY packages/uhn-blueprint-tools/package.json ./packages/uhn-blueprint-tools/
COPY packages/uhn-common/package.json ./packages/uhn-common/
COPY packages/uhn-master/package.json ./packages/uhn-master/
COPY packages/uhn-rule-runtime/package.json ./packages/uhn-rule-runtime/
COPY packages/uhn-ui/package.json ./packages/uhn-ui/
COPY packages/uxp-bff-common/package.json ./packages/uxp-bff-common/
COPY packages/uxp-bff/package.json ./packages/uxp-bff/
COPY packages/uxp-common/package.json ./packages/uxp-common/
COPY packages/uxp-config-dev/package.json ./packages/uxp-config-dev/
COPY packages/uxp-config/package.json ./packages/uxp-config/
COPY packages/uxp-ui-lib/package.json ./packages/uxp-ui-lib/
COPY packages/uxp-ui/package.json ./packages/uxp-ui/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Stage 2: Shared backend base with ALL backend packages and deps installed once
FROM node:22-slim AS backend-base

RUN apt-get update && apt-get install -y curl less iputils-ping netcat-openbsd && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9

WORKDIR /app

# Copy all backend package dist + package.json
COPY --from=builder /app/packages/uxp-bff-common/dist ./uxp-bff-common/dist
COPY --from=builder /app/packages/uxp-bff-common/package.json ./uxp-bff-common/package.json

COPY --from=builder /app/packages/uxp-common/dist ./uxp-common/dist
COPY --from=builder /app/packages/uxp-common/package.json ./uxp-common/package.json

COPY --from=builder /app/packages/uxp-config/dist ./uxp-config/dist
COPY --from=builder /app/packages/uxp-config/package.json ./uxp-config/package.json

COPY --from=builder /app/packages/uxp-config-dev/dist ./uxp-config-dev/dist
COPY --from=builder /app/packages/uxp-config-dev/package.json ./uxp-config-dev/package.json

COPY --from=builder /app/packages/uhn-common/dist ./uhn-common/dist
COPY --from=builder /app/packages/uhn-common/package.json ./uhn-common/package.json

COPY --from=builder /app/packages/uhn-blueprint/dist ./uhn-blueprint/dist
COPY --from=builder /app/packages/uhn-blueprint/package.json ./uhn-blueprint/package.json

COPY --from=builder /app/packages/uhn-rule-runtime/dist ./uhn-rule-runtime/dist
COPY --from=builder /app/packages/uhn-rule-runtime/package.json ./uhn-rule-runtime/package.json

COPY --from=builder /app/packages/uhn-master/dist ./uhn-master/dist
COPY --from=builder /app/packages/uhn-master/package.json ./uhn-master/package.json

COPY --from=builder /app/packages/uxp-bff/dist ./uxp-bff/dist
COPY --from=builder /app/packages/uxp-bff/package.json ./uxp-bff/package.json

# Root package files for pnpm workspace
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Declare all backend packages in the workspace
RUN printf "packages:\n\
  - 'uxp-bff-common'\n\
  - 'uxp-common'\n\
  - 'uxp-config'\n\
  - 'uxp-config-dev'\n\
  - 'uhn-common'\n\
  - 'uhn-blueprint'\n\
  - 'uhn-rule-runtime'\n\
  - 'uhn-master'\n\
  - 'uxp-bff'\n" > /app/pnpm-workspace.yaml

# Single install for all backend deps
RUN pnpm install --prod --force

# --- Backend targets (just set entry point, deps already installed) ---

FROM backend-base AS uxp-bff
ENV NODE_ENV=prod
EXPOSE 3001
WORKDIR /app/uxp-bff
CMD ["sh", "-c", "node ./dist/migration-script.js && node ./dist/uxp.bff.js"]

FROM backend-base AS uhn-master
COPY --from=localhost:5000/uhn-sandbox-tools:latest /usr/lib/uhn/ /usr/lib/uhn/
ENV NODE_ENV=prod
EXPOSE 3031
WORKDIR /app/uhn-master
CMD ["node", "./dist/uhn.master.js"]

# --- Rule runtime utility image (used by edge via COPY --from) ---

FROM node:22-slim AS uhn-runtime
WORKDIR /uhn-runtime

COPY --from=builder /app/packages/uhn-rule-runtime/dist ./packages/uhn-rule-runtime/dist
COPY --from=builder /app/packages/uhn-rule-runtime/package.json ./packages/uhn-rule-runtime/
COPY --from=builder /app/packages/uhn-blueprint/dist ./packages/uhn-blueprint/dist
COPY --from=builder /app/packages/uhn-blueprint/package.json ./packages/uhn-blueprint/
COPY --from=builder /app/packages/uhn-common/dist ./packages/uhn-common/dist
COPY --from=builder /app/packages/uhn-common/package.json ./packages/uhn-common/
COPY --from=builder /app/packages/uxp-common/dist ./packages/uxp-common/dist
COPY --from=builder /app/packages/uxp-common/package.json ./packages/uxp-common/

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

RUN npm install -g pnpm@9
RUN printf "packages:\n\
  - 'packages/uhn-rule-runtime'\n\
  - 'packages/uhn-blueprint'\n\
  - 'packages/uhn-common'\n\
  - 'packages/uxp-common'\n" > /uhn-runtime/pnpm-workspace.yaml

RUN pnpm install --prod --frozen-lockfile

# --- Frontend targets ---

FROM nginx:alpine AS uxp-web
ARG DOMAIN_NAME=localhost
COPY --from=builder /app/packages/uxp-ui/dist /usr/share/nginx/html
COPY --from=builder /app/nginx/nginx-uxp.conf /etc/nginx/conf.d/nginx.conf.template
COPY --from=builder /app/public/static/libs/production /usr/share/nginx/html/static/libs/production

RUN DOMAIN_NAME=${DOMAIN_NAME} envsubst '$DOMAIN_NAME' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf && \
    rm /etc/nginx/conf.d/nginx.conf.template

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

# Remote web: uhn-ui only (production)
FROM nginx:alpine AS remote-web
COPY --from=builder /app/packages/uhn-ui/dist /usr/share/nginx/html/uhn
COPY --from=builder /app/public/static/libs/production /usr/share/nginx/html/static/libs/production
COPY --from=builder /app/nginx/nginx-remote-app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Remote web: all apps (dev/full build)
FROM nginx:alpine AS remote-web-full
COPY --from=builder /app/packages/h2c-ui/dist /usr/share/nginx/html/h2c
COPY --from=builder /app/packages/demo-ui/dist /usr/share/nginx/html/demo
COPY --from=builder /app/packages/uhn-ui/dist /usr/share/nginx/html/uhn
COPY --from=builder /app/public/static/libs/production /usr/share/nginx/html/static/libs/production
COPY --from=builder /app/nginx/nginx-remote-app-full.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
