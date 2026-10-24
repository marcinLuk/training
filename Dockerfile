# syntax=docker/dockerfile:1

# Stage 1: build the app (type check + Vite build) from a clean context.
FROM node:22.23.4-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve dist/ with nginx as a non-root user (uid 101) on port 8080.
# TLS and Basic auth are done by Traefik on the server, not in this image.
FROM nginxinc/nginx-unprivileged:1.31.7-alpine
LABEL org.opencontainers.image.source="https://github.com/marcinLuk/training"
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
