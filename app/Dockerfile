# Uma imagem, dois processos: o docker-compose.yml sobe o server pelo entrypoint e o worker com
# `medusa start` e MEDUSA_WORKER_MODE=worker.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# O build gera .medusa/server: backend compilado e dashboard em public/admin. As dependências de
# runtime vêm do node_modules instalado acima pelo lockfile, só sem as de desenvolvimento.
# A documentação do Medusa sugere `npm install` dentro de .medusa/server, mas ali não há
# lockfile: a resolução do zero leva mais de 10 minutos e não é reproduzível.
RUN npx medusa build && npm prune --omit=dev

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# Binários do node_modules sem `npx`: o processo recebe os sinais do Docker direto, sem o npm no
# meio reportando um SIGTERM de `docker compose stop` como erro.
ENV PATH=/app/node_modules/.bin:$PATH
COPY --from=build --chown=node:node /app/.medusa/server ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chmod=755 server-entrypoint.sh /usr/local/bin/server-entrypoint.sh
USER node
EXPOSE 9000
CMD ["server-entrypoint.sh"]
