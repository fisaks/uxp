# Stage 1: Build the application
FROM node:22 AS builder

# Set the working directory
WORKDIR /app

# Copy only the package.json and package-lock.json first
COPY package.json package-lock.json ./
COPY packages/uxp-bff/package.json ./packages/uxp-bff/
COPY packages/uxp-common/package.json ./packages/uxp-common/
COPY packages/uxp-ui/package.json ./packages/uxp-ui/
COPY packages/uxp-ui-lib/package.json ./packages/uxp-ui-lib/

# Install dependencies for the entire monorepo
RUN npm ci

# Copy the entire monorepo
COPY . .

# Build the app
RUN npm run build

# Stage 2: Runtime container
FROM node:22-slim AS bff

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the build output from the builder stage
COPY --from=builder /app/packages/uxp-bff/dist ./dist
COPY --from=builder /app/.env.prod ./dist/

# Copy only the necessary dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/uxp-bff/package.json ./package.json
COPY --from=builder /app/packages/uxp-common/package.json ./node_modules/@uxp/common/package.json
COPY --from=builder /app/packages/uxp-common/dist ./node_modules/@uxp/common/dist

# Expose the application port
EXPOSE 3001

# Start the application
ENV NODE_ENV=prod
CMD ["node", "dist/index.js"]

FROM nginx:alpine AS web
COPY --from=builder /app/packages/uxp-ui/dist /usr/share/nginx/html
COPY --from=builder /app/.env.prod /etc/nginx/conf.d/.env
COPY ./packages/uxp-ui/nginx.conf /etc/nginx/conf.d/nginx.conf

RUN export $(cat /etc/nginx/conf.d/.env | xargs) && \
    envsubst '$DOMAIN_NAME,$LOCAL_NETWORK' < /etc/nginx/conf.d/nginx.conf > /etc/nginx/conf.d/default.conf && rm /etc/nginx/conf.d/.env


COPY ./packages/uxp-ui/.htpasswd /etc/nginx/conf.d/.htpasswd
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
