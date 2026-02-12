# syntax=docker/dockerfile:1
FROM mcr.microsoft.com/playwright:v1.58.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY verify-content.cjs ./verify-content.cjs

RUN npm run build \
  && npm prune --omit=dev \
  && chown -R pwuser:pwuser /app

ENV NODE_ENV=production
ENV PORT=8080
ENV OLLAMA_AUTO_PULL=false
ENV OLLAMA_WARMUP_TIMEOUT_MS=5000

EXPOSE 8080

USER pwuser

CMD ["node", "dist/index.js"]
