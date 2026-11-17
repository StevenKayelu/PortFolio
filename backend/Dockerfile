# Devegen API — production image (runs next to MotoGo on the shared server).
# Debian slim rather than Alpine: Prisma's engines and sharp's prebuilt
# binaries are most reliable on glibc.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
COPY scripts ./scripts
COPY assets ./assets

# Run as the unprivileged "node" user; uploads (local driver) and private
# files live in volumes owned by it.
RUN mkdir -p /app/src/uploads /app/private_uploads && chown -R node:node /app/src/uploads /app/private_uploads
USER node

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
