# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY --from=builder /app/build/ ./build/
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/templates/ ./templates/
COPY --from=builder /app/package.json /app/package-lock.json ./

RUN npm ci --omit=dev

VOLUME /repo

ENV PORT=5173
ENV HOST=0.0.0.0
ENV DOCSMD_REPO_ROOT=/repo
ENV NODE_ENV=production

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5173/api/health || exit 1

CMD ["node", "build/index.js"]
