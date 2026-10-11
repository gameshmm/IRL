# ─── Build Stage: compila o dashboard React ───────────────────────────────────
FROM node:20-alpine AS dashboard-builder

WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci --silent
COPY dashboard/ ./
RUN npm run build

# ─── Production Stage: servidor Node.js ───────────────────────────────────────
FROM node:20-alpine AS server

WORKDIR /app

# Instala dependências do servidor (camada cacheável)
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev --silent

# Copia código do servidor
COPY server/ ./server/

# Copia o build do dashboard para ser servido pelo Express
COPY --from=dashboard-builder /app/dashboard/dist ./dashboard/dist

# Cria diretórios de dados persistentes
RUN mkdir -p ./server/media ./data

# ─── Variáveis de ambiente padrão ─────────────────────────────────────────────
ENV NODE_ENV=production \
    API_PORT=3001 \
    DB_PATH=/app/data/irl.db \
    JWT_SECRET=change_this_secret_in_production

# ─── Portas expostas ──────────────────────────────────────────────────────────
# 1935 → RTMP (celular envia o stream aqui)
# 8000 → HTTP-FLV / HLS (OBS e player consomem aqui)
# 3001 → API REST + Dashboard
EXPOSE 1935 8000 3001

# ─── Ponto de entrada ─────────────────────────────────────────────────────────
WORKDIR /app/server
CMD ["node", "src/index.js"]
