package main

import (
	"context"
	"database/sql"
	"embed"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"sort"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const maxStateBytes = 512 << 10

//go:embed dist content/*.json
var assets embed.FS

type contentResponse struct {
	Version int           `json:"version"`
	Packs   []contentPack `json:"packs"`
}

type contentPack struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	Stage         string   `json:"stage"`
	Topic         string   `json:"topic"`
	Order         int      `json:"order"`
	Unit          int      `json:"unit"`
	Prerequisites []string `json:"prerequisites"`
	Source        string   `json:"source"`
	Cards         []card   `json:"cards"`
}

type card struct {
	ID          string   `json:"id"`
	Kind        string   `json:"kind"`
	Prompt      string   `json:"prompt"`
	Translation string   `json:"translation"`
	Verb        string   `json:"verb,omitempty"`
	Person      string   `json:"person,omitempty"`
	Clue        string   `json:"clue,omitempty"`
	Answers     []string `json:"answers"`
	Answer      string   `json:"answer"`
	Note        string   `json:"note"`
}

type cardProgress struct {
	Level    int   `json:"level"`
	Attempts int   `json:"attempts"`
	Due      int64 `json:"due"`
}

type streak struct {
	Count int    `json:"count,omitempty"`
	Last  string `json:"last,omitempty"`
}

type studyState struct {
	Cards      map[string]cardProgress `json:"cards"`
	Streak     streak                  `json:"streak"`
	CourseUnit int                     `json:"courseUnit,omitempty"`
	UpdatedAt  int64                   `json:"updatedAt"`
}

func main() {
	content, err := loadContent(assets)
	if err != nil {
		log.Fatal(err)
	}

	trustProxyIdentity := os.Getenv("TRUST_PROXY_IDENTITY") == "true"
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" && trustProxyIdentity {
		log.Fatal("DATABASE_URL is required")
	}

	var db *sql.DB
	if databaseURL != "" {
		db, err = sql.Open("pgx", databaseURL)
		if err != nil {
			log.Fatal(err)
		}
		defer db.Close()
		db.SetMaxOpenConns(4)
		db.SetMaxIdleConns(2)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if _, err := db.ExecContext(ctx, `
			CREATE TABLE IF NOT EXISTS study_progress (
				google_subject text PRIMARY KEY,
				email text NOT NULL DEFAULT '',
				state jsonb NOT NULL,
				updated_at timestamptz NOT NULL DEFAULT now()
			)`); err != nil {
			log.Fatal(err)
		}
	}

	static, err := fs.Sub(assets, "dist")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok\n")) })
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, r *http.Request) {
		if db != nil && db.PingContext(r.Context()) != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}
		w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("/api/content", contentHandler(content))
	mux.HandleFunc("/api/me", meHandler(trustProxyIdentity))
	mux.HandleFunc("/api/progress", progressHandler(db, trustProxyIdentity))
	mux.Handle("/", http.FileServer(http.FS(static)))

	server := &http.Server{
		Addr:              ":8080",
		Handler:           securityHeaders(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	log.Printf("listening on %s", server.Addr)
	log.Fatal(server.ListenAndServe())
}

func loadContent(fsys fs.FS) (contentResponse, error) {
	paths, err := fs.Glob(fsys, "content/*.json")
	if err != nil {
		return contentResponse{}, err
	}
	if len(paths) == 0 {
		return contentResponse{}, errors.New("no content packs found")
	}

	content := contentResponse{Version: 1}
	for _, path := range paths {
		file, err := fsys.Open(path)
		if err != nil {
			return contentResponse{}, err
		}
		decoder := json.NewDecoder(file)
		decoder.DisallowUnknownFields()
		var pack contentPack
		if err := decoder.Decode(&pack); err != nil {
			file.Close()
			return contentResponse{}, errors.New(path + ": " + err.Error())
		}
		if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
			file.Close()
			return contentResponse{}, errors.New(path + ": invalid trailing content")
		}
		file.Close()
		content.Packs = append(content.Packs, pack)
	}
	sort.Slice(content.Packs, func(i, j int) bool { return content.Packs[i].Order < content.Packs[j].Order })
	if err := validateContent(content); err != nil {
		return contentResponse{}, err
	}
	return content, nil
}

func validateContent(content contentResponse) error {
	packIDs := make(map[string]bool, len(content.Packs))
	cardIDs := make(map[string]bool)
	validTopics := map[string]bool{"conversation": true, "plans": true, "numbers": true, "people": true, "verbs": true, "places": true, "shopping": true, "routines": true, "food": true, "abilities": true}
	for _, pack := range content.Packs {
		if pack.ID == "" || pack.Title == "" || pack.Description == "" || pack.Stage == "" || !validTopics[pack.Topic] || pack.Order < 1 || pack.Unit < 0 || pack.Unit > 9 || pack.Source == "" || len(pack.Cards) == 0 || packIDs[pack.ID] {
			return errors.New("invalid content pack: " + pack.ID)
		}
		packIDs[pack.ID] = true
		for _, card := range pack.Cards {
			if card.ID == "" || len(card.ID) > 100 || card.Kind == "" || card.Prompt == "" || card.Translation == "" || len(card.Answers) == 0 || card.Answer == "" || card.Note == "" || cardIDs[card.ID] {
				return errors.New("invalid content card: " + card.ID)
			}
			for _, answer := range card.Answers {
				if answer == "" {
					return errors.New("invalid content answer: " + card.ID)
				}
			}
			cardIDs[card.ID] = true
		}
	}
	for _, pack := range content.Packs {
		for _, prerequisite := range pack.Prerequisites {
			if !packIDs[prerequisite] || prerequisite == pack.ID {
				return errors.New("invalid prerequisite for content pack: " + pack.ID)
			}
		}
	}
	return nil
}

func contentHandler(content contentResponse) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		writeJSON(w, content)
	}
}

func meHandler(trustProxyIdentity bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !trustProxyIdentity {
			http.Error(w, "profile is not enabled", http.StatusServiceUnavailable)
			return
		}
		if r.Header.Get("X-Forwarded-User") == "" {
			http.Error(w, "authentication required", http.StatusUnauthorized)
			return
		}
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		writeJSON(w, map[string]string{"name": r.Header.Get("X-Forwarded-Name")})
	}
}

func progressHandler(db *sql.DB, trustProxyIdentity bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !trustProxyIdentity {
			http.Error(w, "progress sync is not enabled", http.StatusServiceUnavailable)
			return
		}
		subject := r.Header.Get("X-Forwarded-User")
		if subject == "" {
			http.Error(w, "authentication required", http.StatusUnauthorized)
			return
		}

		switch r.Method {
		case http.MethodGet:
			var raw json.RawMessage
			err := db.QueryRowContext(r.Context(), "SELECT state FROM study_progress WHERE google_subject = $1", subject).Scan(&raw)
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, map[string]any{"exists": false, "state": emptyState()})
				return
			}
			if err != nil {
				http.Error(w, "could not load progress", http.StatusInternalServerError)
				return
			}
			writeJSON(w, map[string]any{"exists": true, "state": raw})

		case http.MethodPut:
			defer r.Body.Close()
			decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxStateBytes))
			decoder.DisallowUnknownFields()
			var state studyState
			if err := decoder.Decode(&state); err != nil {
				http.Error(w, "invalid progress", http.StatusBadRequest)
				return
			}
			if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
				http.Error(w, "invalid progress", http.StatusBadRequest)
				return
			}
			if err := validateState(state); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			if state.UpdatedAt == 0 {
				state.UpdatedAt = time.Now().UnixMilli()
			}
			raw, _ := json.Marshal(state)
			_, err := db.ExecContext(r.Context(), `
				INSERT INTO study_progress (google_subject, email, state)
				VALUES ($1, $2, $3)
				ON CONFLICT (google_subject) DO UPDATE
				SET email = EXCLUDED.email, state = EXCLUDED.state, updated_at = now()
			`, subject, r.Header.Get("X-Forwarded-Email"), raw)
			if err != nil {
				http.Error(w, "could not save progress", http.StatusInternalServerError)
				return
			}
			w.WriteHeader(http.StatusNoContent)

		default:
			w.Header().Set("Allow", "GET, PUT")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func emptyState() studyState {
	return studyState{Cards: map[string]cardProgress{}}
}

func validateState(state studyState) error {
	if state.Cards == nil || len(state.Cards) > 1000 {
		return errors.New("invalid cards")
	}
	for id, progress := range state.Cards {
		if id == "" || len(id) > 100 || progress.Level < 0 || progress.Level > 4 || progress.Attempts < 0 || progress.Due < 0 {
			return errors.New("invalid card progress")
		}
	}
	if state.Streak.Count < 0 || state.Streak.Count > 100000 || len(state.Streak.Last) > 10 || (state.CourseUnit != 0 && (state.CourseUnit < 2 || state.CourseUnit > 9)) || state.UpdatedAt < 0 {
		return errors.New("invalid study progress")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, value any) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("write response: %v", err)
	}
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
		w.Header().Set("Referrer-Policy", "no-referrer")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		if r.URL.Path == "/app.js" || r.URL.Path == "/styles.css" {
			w.Header().Set("Cache-Control", "no-store")
		}
		next.ServeHTTP(w, r)
	})
}
