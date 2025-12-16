# syntax = docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js/Prisma"

WORKDIR /app

ENV NODE_ENV="production"

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

COPY package*.json ./
RUN npm ci --include=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

RUN npm prune --omit=dev

# Production stage
FROM base

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/package.json /app/package.json

EXPOSE 3000

CMD ["npm", "run", "start"]
