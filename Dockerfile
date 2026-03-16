# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
# Diğer gerekli dosyalar (hafıza, soul, vb.)
COPY soul.md heartbeat.md core_memory.md ./
# Eğer credentials klasörü varsa onu da kopyala
COPY credentials ./credentials

# SQLite veritabanı dizini
RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/index.js"]
