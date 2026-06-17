# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Build deps for better-sqlite3 (native module) in case prebuilds are unavailable.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install server deps first (cached unless server manifests change).
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Install client deps (cached unless client manifests change).
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

# Copy the rest of the source and build both packages.
COPY . .
RUN cd server && npm run build && cd ../client && npm run build

# Drop dev dependencies from the server for a lean runtime node_modules.
RUN cd server && npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
