# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY soul.md heartbeat.md ./
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
COPY soul.md heartbeat.md ./

# SQLite hafıza dizini
RUN mkdir -p memory

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
