# TrackFlow UIs — one development container running both Next.js apps:
#   website    -> port 3000
#   backoffice -> port 3001
# Build context: /uis. Source is bind-mounted by docker-compose.yml for hot reload;
# node_modules stay inside the container (named volumes) so host and container
# dependencies never mix.
FROM node:22-alpine

# libc6-compat is recommended for Next.js native modules on Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app/uis

# Install each app's dependencies separately (separate lockfiles, cached layers).
COPY website/package.json website/package-lock.json ./website/
RUN npm ci --prefix website --no-audit --no-fund

COPY backoffice/package.json backoffice/package-lock.json ./backoffice/
RUN npm ci --prefix backoffice --no-audit --no-fund

COPY . .
RUN chmod +x ./start.sh

ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000 3001

CMD ["./start.sh"]
