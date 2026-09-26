FROM golang:1.27-alpine AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
COPY dist/ ./dist/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /spanish-study .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /spanish-study /spanish-study
EXPOSE 8080
ENTRYPOINT ["/spanish-study"]
