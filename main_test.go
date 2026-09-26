package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

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
