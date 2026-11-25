package service

import (
	"net/url"
	"testing"

	"github.com/gofeatureflag/flag-management-system/server/management/config"
	"github.com/stretchr/testify/assert"
	"golang.org/x/oauth2"
)

func TestHostedDomainRestriction(t *testing.T) {
	tests := []struct {
		name, domain, email, hd string
		verified, want          bool
	}{
		{"workspace member", "atok.io", "member@atok.io", "atok.io", true, true},
		{"case insensitive", "atok.io", "Member@ATOK.IO", "ATOK.IO", true, true},
		{"consumer account", "atok.io", "member@gmail.com", "", true, false},
		{"missing hd", "atok.io", "member@atok.io", "", true, false},
		{"wrong workspace", "atok.io", "member@atok.io", "other.io", true, false},
		{"email suffix attack", "atok.io", "member@atok.io.attacker.com", "atok.io", true, false},
		{"email prefix attack", "atok.io", "member@evil-atok.io", "atok.io", true, false},
		{"unverified member", "atok.io", "member@atok.io", "atok.io", false, false},
		{"empty local part", "atok.io", "@atok.io", "atok.io", true, false},
		{"multiple separators", "atok.io", "member@other@atok.io", "atok.io", true, false},
		{"unrestricted provider", "", "member@other.io", "", false, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := AuthService{cfg: config.Config{OIDC: config.OIDCConfig{HostedDomain: tt.domain}}}
			assert.Equal(t, tt.want, s.allowsHostedDomain(tt.email, tt.hd, tt.verified))
		})
	}
}

func TestAuthURLHostedDomainHint(t *testing.T) {
	for _, domain := range []string{"", "atok.io"} {
		t.Run(domain, func(t *testing.T) {
			s := AuthService{cfg: config.Config{OIDC: config.OIDCConfig{HostedDomain: domain}}, oauth: &oauth2.Config{Endpoint: oauth2.Endpoint{AuthURL: "https://accounts.google.com/o/oauth2/v2/auth"}}}
			u, err := url.Parse(s.AuthURL("state", "verifier", "nonce"))
			assert.NoError(t, err)
			assert.Equal(t, domain, u.Query().Get("hd"))
			assert.Equal(t, "nonce", u.Query().Get("nonce"))
			assert.Equal(t, "S256", u.Query().Get("code_challenge_method"))
		})
	}
}

func TestExchangeRejectsForeignWorkspaceBeforePersistence(t *testing.T) {
	tests := []struct{ name, claims string }{
		{"no hd", `{"sub":"foreign","email":"person@atok.io","email_verified":true}`},
		{"wrong hd", `{"sub":"foreign","email":"person@atok.io","email_verified":true,"hd":"other.io"}`},
		{"wrong email", `{"sub":"foreign","email":"person@gmail.com","email_verified":true,"hd":"atok.io"}`},
		{"unverified override", `{"sub":"foreign","email":"person@atok.io","email_verified":false,"hd":"atok.io"}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := authExchangeService(t, nil, tt.claims)
			s.cfg.OIDC.HostedDomain = "atok.io"
			s.cfg.Auth.AllowUnverifiedEmail = true
			_, _, err := s.Exchange(t.Context(), "code", "verifier", testNonce)
			assert.ErrorIs(t, err, ErrLoginRejected)
			assert.ErrorContains(t, err, "hosted domain not allowed")
		})
	}
}

func FuzzHostedDomain(f *testing.F) {
	f.Add("member@atok.io", "atok.io", true)
	f.Add("member@atok.io.attacker.com", "atok.io", true)
	s := AuthService{cfg: config.Config{OIDC: config.OIDCConfig{HostedDomain: "atok.io"}}}
	f.Fuzz(func(t *testing.T, email, hd string, verified bool) {
		if !verified {
			assert.False(t, s.allowsHostedDomain(email, hd, verified))
		}
		assert.False(t, s.allowsHostedDomain(email, "foreign.invalid", verified))
	})
}
