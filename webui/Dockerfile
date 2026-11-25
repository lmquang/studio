# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /src
COPY webui/package.json webui/package-lock.json ./
RUN npm ci
COPY webui/ ./
RUN npm test && npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
ENV API_UPSTREAM=http://api:8080
# Limit envsubst to this variable; preserve nginx's $host, $uri, etc.
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
COPY webui/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
