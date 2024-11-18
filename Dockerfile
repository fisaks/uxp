# Stage 1: Build the application
FROM node:22 AS builder

# Set the working directory
WORKDIR /app

# Copy only the package.json and package-lock.json first
COPY package.json package-lock.json ./
COPY packages/uxp-bff/package.json ./packages/uxp-bff/
COPY packages/uxp-common/package.json ./packages/uxp-common/
COPY packages/uxp-ui-core/package.json ./packages/uxp-ui-core/
COPY packages/uxp-ui-presenter/package.json ./packages/uxp-ui-presenter/

# Install dependencies for the entire monorepo
RUN npm install

# Copy the entire monorepo
COPY . .

# Build the app
RUN npm run build

# Stage 2: Runtime container
FROM node:22-slim as bff

# Set the working directory
WORKDIR /app

# Copy the build output from the builder stage
COPY --from=builder /app/packages/uxp-bff/dist ./dist

# Copy only the necessary dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/uxp-bff/package.json ./package.json

# Expose the application port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]

FROM nginx:alpine as web
COPY --from=builder /app/packages/uxp-ui-core/dist /usr/share/nginx/html
COPY --from=builder /app/.env /etc/nginx/conf.d/.env
COPY ./packages/uxp-ui-core/nginx.conf /etc/nginx/conf.d/nginx.conf

RUN export $(cat /etc/nginx/conf.d/.env | xargs) && \
    envsubst '$DOMAIN_NAME,$LOCAL_NETWORK' < /etc/nginx/conf.d/nginx.conf > /etc/nginx/conf.d/default.conf && rm /etc/nginx/conf.d/.env


COPY ./packages/uxp-ui-core/.htpasswd /etc/nginx/conf.d/.htpasswd
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
