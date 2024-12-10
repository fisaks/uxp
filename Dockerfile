# Stage 1: Build the application
FROM node:22 AS builder

RUN npm install -g pnpm

# Set the working directory
WORKDIR /app



# Copy only the package.json and package-lock.json first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/uxp-bff/package.json ./packages/uxp-bff/
COPY packages/uxp-common/package.json ./packages/uxp-common/
COPY packages/uxp-ui/package.json ./packages/uxp-ui/
COPY packages/uxp-ui-lib/package.json ./packages/uxp-ui-lib/


# Install dependencies for the entire monorepo
RUN pnpm fetch
RUN pnpm install --offline --frozen-lockfile

# Copy the entire monorepo
COPY . .

# Build the app
RUN pnpm run build

# Stage 2: Runtime container
#docker run -it uxp-bff-server /bin/sh
FROM node:22-slim AS bff

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app



# Copy necessary files and directories

COPY --from=builder /app/.env.prod ./
COPY --from=builder /app/packages/uxp-bff/dist ./uxp-bff/dist
COPY --from=builder /app/packages/uxp-bff/package.json ./uxp-bff/

COPY --from=builder /app/packages/uxp-common/dist ./uxp-common/dist
COPY --from=builder /app/packages/uxp-common/package.json ./uxp-common/package.json

COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

RUN echo "packages:\n  - 'uxp-bff'\n  - 'uxp-common'\n" > /app/pnpm-workspace.yaml

# Install production dependencies for the backend only
RUN pnpm install --prod --filter=@uxp/bff --filter=@uxp/common...

# Expose the application port
EXPOSE 3001

# Start the application
ENV NODE_ENV=prod
WORKDIR /app/uxp-bff
CMD ["node", "./dist/index.js"]

FROM nginx:alpine AS web
COPY --from=builder /app/packages/uxp-ui/dist /usr/share/nginx/html
COPY --from=builder /app/.env.prod /etc/nginx/conf.d/.env
COPY ./packages/uxp-ui/nginx.conf /etc/nginx/conf.d/nginx.conf

RUN export $(cat /etc/nginx/conf.d/.env | xargs) && \
    envsubst '$DOMAIN_NAME,$LOCAL_NETWORK' < /etc/nginx/conf.d/nginx.conf > /etc/nginx/conf.d/default.conf && rm /etc/nginx/conf.d/.env


COPY ./packages/uxp-ui/.htpasswd /etc/nginx/conf.d/.htpasswd
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
