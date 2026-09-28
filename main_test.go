package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestContentAPIProvidesValidatedPacks(t *testing.T) {
	content, err := loadContent(assets)
	if err != nil {
		t.Fatal(err)
	}
	if len(content.Packs) != 17 {
		t.Fatalf("got %d packs, want 17", len(content.Packs))
	}
	cardCount := 0
	for _, pack := range content.Packs {
		cardCount += len(pack.Cards)
	}
	if cardCount != 519 {
		t.Fatalf("got %d cards, want 519", cardCount)
	}

	request := httptest.NewRequest(http.MethodGet, "/api/content", nil)
	response := httptest.NewRecorder()
	contentHandler(content).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusOK)
	}
	var result contentResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.Version != 1 || len(result.Packs) != 17 {
		t.Fatalf("unexpected content response: version %d, packs %d", result.Version, len(result.Packs))
	}
}

func TestContentValidationRejectsDuplicateCardIDs(t *testing.T) {
	content, err := loadContent(assets)
	if err != nil {
		t.Fatal(err)
	}
	content.Packs[1].Cards[0].ID = content.Packs[0].Cards[0].ID
	if err := validateContent(content); err == nil {
		t.Fatal("duplicate card ID accepted")
	}
}

func TestMeAPIUsesVerifiedProfileName(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	request.Header.Set("X-Forwarded-User", "google-subject")
	request.Header.Set("X-Forwarded-Name", "Marcus Pamelia")
	response := httptest.NewRecorder()

	meHandler(true).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusOK)
	}
	var profile struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(response.Body).Decode(&profile); err != nil {
		t.Fatal(err)
	}
	if profile.Name != "Marcus Pamelia" {
		t.Fatalf("got name %q, want Marcus Pamelia", profile.Name)
	}
}

func TestValidateState(t *testing.T) {
	valid := studyState{
		Cards:  map[string]cardProgress{"comer-yo": {Level: 2, Attempts: 3, Due: 1234}},
		Streak: streak{Count: 2, Last: "2026-09-26"},
	}
	if err := validateState(valid); err != nil {
		t.Fatalf("valid state rejected: %v", err)
	}

	invalid := valid
	invalid.Cards = map[string]cardProgress{"comer-yo": {Level: 99}}
	if err := validateState(invalid); err == nil {
		t.Fatal("invalid level accepted")
	}
}

func TestProgressAPIRejectsSpoofedIdentityUntilProxyIsEnabled(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/progress", nil)
	request.Header.Set("X-Forwarded-User", "spoofed-user")
	response := httptest.NewRecorder()

	progressHandler(nil, false).ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("got status %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
}
