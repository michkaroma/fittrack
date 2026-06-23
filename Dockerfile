# syntax=docker/dockerfile:1

# ---- Étape build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Outils pour compiler better-sqlite3 si aucun binaire pré-compilé n'est dispo
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- Étape runtime ----
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# Tourne en utilisateur non-root `node` (uid 1000) — pas de privilèges root dans le conteneur.
# Le volume hôte ./data doit appartenir à l'uid 1000 : sudo chown -R 1000:1000 ./data
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "build/index.js"]
