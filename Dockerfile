# Stage 1: Build the application
FROM node:22 AS builder

RUN npm install -g pnpm

# Set the working directory
WORKDIR /app



# Copy only the package.json and package-lock.json first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
#COPY packages/demo-bff/package.json ./packages/demo-bff/
#COPY packages/demo-ui/package.json ./packages/demo-ui/
#COPY packages/h2c-bff/package.json ./packages/h2c-bff/
#COPY packages/h2c-common/package.json ./packages/h2c-common/
#COPY packages/h2c-ui/package.json ./packages/h2c-ui/
#COPY packages/tools/package.json ./packages/tools/
#COPY packages/uxp-bff/package.json ./packages/uxp-bff/
#COPY packages/uxp-bff-common/package.json ./packages/uxp-bff-common/
#COPY packages/uxp-common/package.json ./packages/uxp-common/
#COPY packages/uxp-ui/package.json ./packages/uxp-ui/
#COPY packages/uxp-ui-lib/package.json ./packages/uxp-ui-lib/
COPY packages/**/package.json ./packages/

# Install dependencies for the entire monorepo
RUN pnpm fetch
RUN pnpm install --offline --frozen-lockfile

# Copy the entire monorepo
COPY . .

# Build the app
RUN pnpm run build

# Create shared base for backend services
FROM node:22-slim AS backend-base

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /app

COPY --from=builder /app/packages/uxp-bff-common/dist ./uxp-bff-common/dist
COPY --from=builder /app/packages/uxp-bff-common/package.json ./uxp-bff-common/package.json

COPY --from=builder /app/packages/uxp-common/dist ./uxp-common/dist
COPY --from=builder /app/packages/uxp-common/package.json ./uxp-common/package.json

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN echo "packages:\n  - 'uxp-bff-common'\n  - 'uxp-common'\n" > /app/pnpm-workspace.yaml

RUN pnpm install --prod --force



# create the uxp bff 
FROM backend-base AS uxp-bff

# Copy necessary files and directories

COPY --from=builder /app/.env.prod ./
COPY --from=builder /app/packages/uxp-bff/dist ./uxp-bff/dist
COPY --from=builder /app/packages/uxp-bff/package.json ./uxp-bff/


#COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
#COPY --from=builder /app/pnpm-workspace.yaml pnpm-workspace.yaml
#RUN echo "packages:\n  - 'uxp-bff'\n  - 'uxp-bff-common'\n  - 'uxp-common'\n" > /app/pnpm-workspace.yaml
RUN echo "  - 'uxp-bff'\n" >> /app/pnpm-workspace.yaml

# Install production dependencies for the backend only
#RUN pnpm install --prod --filter=@uxp/bff --filter=@uxp/bff-coomon --filter=@uxp/common...
RUN pnpm install --prod 
RUN pnpm rebuild bcrypt

# Expose the application port
EXPOSE 3001

# Start the application
ENV NODE_ENV=prod
WORKDIR /app/uxp-bff
#CMD ["node", "./dist/index.js"]
CMD ["sh", "-c", "node ./dist/migration-script.js && node ./dist/uxp.bff.js"]

# create the demo bff 
FROM backend-base AS demo-bff

# Set the working directory
WORKDIR /app

# Copy necessary files and directories

COPY --from=builder /app/.env.prod ./
COPY --from=builder /app/packages/demo-bff/dist ./demo-bff/dist
COPY --from=builder /app/packages/demo-bff/package.json ./demo-bff/

#COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
#COPY --from=builder /app/pnpm-workspace.yaml pnpm-workspace.yaml

#RUN echo "packages:\n  - 'demo-bff'\n  - 'uxp-bff-common'\n  - 'uxp-common'\n" > /app/pnpm-workspace.yaml
RUN echo "  - 'demo-bff'\n" >> /app/pnpm-workspace.yaml

# Install production dependencies for the backend only
#RUN pnpm install --prod --filter=@demo/bff --filter=@uxp/bff-coomon --filter=@uxp/common...
RUN pnpm install --prod 

# Expose the application port
EXPOSE 3021

# Start the application
ENV NODE_ENV=prod
WORKDIR /app/demo-bff


##CMD ["node ./dist/migration-script.js && node ./dist/index.js"]
CMD ["node", "./dist/demo.bff.js"]


# create the h2c bff 
FROM backend-base AS h2c-bff

# Set the working directory
WORKDIR /app

# Copy necessary files and directories

COPY --from=builder /app/.env.prod ./
COPY --from=builder /app/packages/h2c-bff/dist ./h2c-bff/dist
COPY --from=builder /app/packages/h2c-bff/package.json ./h2c-bff/

COPY --from=builder /app/packages/h2c-common/dist ./h2c-common/dist
COPY --from=builder /app/packages/h2c-common/package.json ./h2c-common/

#COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
#COPY --from=builder /app/pnpm-workspace.yaml pnpm-workspace.yaml
#RUN echo "packages:\n  - 'h2c-bff'\n  - 'h2c-common'\n  - 'uxp-bff-common'\n  - 'uxp-common'\n" > /app/pnpm-workspace.yaml
RUN echo "  - 'h2c-bff'\n  - 'h2c-common'\n" >> /app/pnpm-workspace.yaml

# Install production dependencies for the backend only
#RUN pnpm install --prod --filter=@h2c/bff --filter=@uxp/bff-coomon --filter=@uxp/common...
RUN pnpm install --prod 

# Expose the application port
EXPOSE 3011

# Start the application
ENV NODE_ENV=prod
WORKDIR /app/h2c-bff
#CMD ["node", "./dist/index.js"]
CMD ["sh", "-c", "node ./dist/migration-script.js && node ./dist/h2c.bff.js"]

# create the uxp web 
FROM nginx:alpine AS uxp-web
COPY --from=builder /app/packages/uxp-ui/dist /usr/share/nginx/html
COPY --from=builder /app/.env.prod /etc/nginx/conf.d/.env
COPY --from=builder /app/nginx/nginx-uxp.conf /etc/nginx/conf.d/nginx.conf
COPY --from=builder /app/public/static/libs/production /usr/share/nginx/html/static/libs/production

RUN export $(cat /etc/nginx/conf.d/.env | xargs) && \
    envsubst '$DOMAIN_NAME,$API_BASE_URL' < /etc/nginx/conf.d/nginx.conf > /etc/nginx/conf.d/default.conf && rm /etc/nginx/conf.d/.env


EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

# create the remote web 
FROM nginx:alpine AS remote-web
COPY --from=builder /app/packages/h2c-ui/dist /usr/share/nginx/html/h2c
COPY --from=builder /app/packages/demo-ui/dist /usr/share/nginx/html/demo
COPY --from=builder /app/public/static/libs/production /usr/share/nginx/html/static/libs/production

COPY --from=builder /app/nginx/nginx-remote-app.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
