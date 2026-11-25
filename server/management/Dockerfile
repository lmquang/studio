# syntax=docker/dockerfile:1
ARG GO_VERSION=1.26.9
FROM golang:${GO_VERSION}-bookworm AS build
WORKDIR /src
COPY server/management/go.mod server/management/go.sum ./
RUN go mod download
COPY server/management/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/studio-api .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/studio-api /studio-api
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/studio-api"]
