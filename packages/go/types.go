package searchsdk

import (
	"context"
	"encoding/json"
	"time"
)

// Request is the normalized web-search subset. Zero Limit means the default 5.
// Nil domain lists mean absent; non-nil empty lists are invalid.
type Request struct {
	Query          string   `json:"query"`
	Limit          int      `json:"limit,omitempty"`
	IncludeDomains []string `json:"includeDomains,omitempty"`
	ExcludeDomains []string `json:"excludeDomains,omitempty"`
}

type Provenance struct {
	Provider    string `json:"provider"`
	SourceURL   string `json:"sourceUrl"`
	RetrievedAt string `json:"retrievedAt"`
	RequestID   string `json:"requestId,omitempty"`
}
type Result struct {
	URL        string     `json:"url"`
	Title      *string    `json:"title,omitempty"`
	Snippet    *string    `json:"snippet,omitempty"`
	Highlights []string   `json:"highlights,omitempty"`
	Score      *float64   `json:"score,omitempty"`
	Provenance Provenance `json:"provenance"`
}
type Usage struct {
	Unit  string  `json:"unit"`
	Value float64 `json:"value"`
}
type Warning struct {
	Code     string `json:"code"`
	Provider string `json:"provider"`
}
type ProviderResponse struct {
	Results  []Result  `json:"results"`
	Usage    *Usage    `json:"usage"`
	Warnings []Warning `json:"warnings"`
}
type Attempt struct {
	Provider     string   `json:"provider"`
	StartedAt    string   `json:"startedAt"`
	DurationMS   float64  `json:"durationMs"`
	Outcome      string   `json:"outcome"`
	Code         Code     `json:"code,omitempty"`
	Status       int      `json:"status,omitempty"`
	RetryAfterMS *float64 `json:"retryAfterMs,omitempty"`
}
type Response struct {
	ProviderResponse
	Provider string    `json:"provider"`
	Attempts []Attempt `json:"attempts"`
	Reuse    string    `json:"reuse,omitempty"`
}
type Capabilities struct {
	DomainFilters                  bool `json:"domainFilters"`
	MutuallyExclusiveDomainFilters bool `json:"mutuallyExclusiveDomainFilters,omitempty"`
	MaxIncludeDomains              int  `json:"maxIncludeDomains"`
	MaxExcludeDomains              int  `json:"maxExcludeDomains"`
	MaxQueryLength                 int  `json:"maxQueryLength,omitempty"`
}

// Provider implementations must honor context cancellation. Client does not spawn
// unbounded goroutines to hide a custom provider that ignores its context.
type Provider interface {
	ID() string
	Capabilities() Capabilities
	Search(context.Context, Request) (ProviderResponse, error)
}

type Code string

const (
	InvalidRequest    Code = "invalid_request"
	UnsupportedOption Code = "unsupported_option"
	Configuration     Code = "configuration"
	Auth              Code = "auth"
	RateLimit         Code = "rate_limit"
	Network           Code = "network"
	Unavailable       Code = "unavailable"
	AttemptTimeout    Code = "attempt_timeout"
	Timeout           Code = "timeout"
	Aborted           Code = "aborted"
	InvalidResponse   Code = "invalid_response"
	ProviderError     Code = "provider_error"
)

// Error contains only sanitized metadata. It deliberately does not wrap upstream
// errors, URLs, response bodies, request queries, or credentials.
type Error struct {
	Code         Code      `json:"code"`
	Status       int       `json:"status,omitempty"`
	RetryAfterMS *float64  `json:"retryAfterMs,omitempty"`
	Attempts     []Attempt `json:"attempts"`
}

func (e *Error) Error() string { return "searchsdk: " + string(e.Code) }
func fail(c Code) *Error       { return &Error{Code: c, Attempts: []Attempt{}} }
func validCode(c Code) bool {
	switch c {
	case InvalidRequest, UnsupportedOption, Configuration, Auth, RateLimit, Network, Unavailable, AttemptTimeout, Timeout, Aborted, InvalidResponse, ProviderError:
		return true
	}
	return false
}
func transient(c Code) bool {
	return c == Network || c == Unavailable || c == RateLimit || c == AttemptTimeout
}
func contextError(ctx context.Context) *Error {
	if ctx.Err() == context.DeadlineExceeded {
		return fail(Timeout)
	}
	return fail(Aborted)
}
func statusError(status int) *Error {
	c := ProviderError
	switch {
	case status == 401 || status == 402 || status == 403 || status == 432 || status == 433:
		c = Auth
	case status == 429:
		c = RateLimit
	case status == 408 || status >= 500 && status <= 599:
		c = Unavailable
	}
	e := fail(c)
	e.Status = status
	return e
}

// RetryPolicy is opt-in. MaxRetries counts additional attempts, at most five.
// Retries may incur repeated billing. Retry-After is never shortened.
type RetryPolicy struct {
	MaxRetries int
	BaseDelay  time.Duration
	MaxDelay   time.Duration
}

func normalizeRetry(p RetryPolicy) (RetryPolicy, error) {
	if p.MaxRetries < 0 || p.MaxRetries > 5 || p.BaseDelay < 0 || p.MaxDelay < 0 {
		return p, fail(Configuration)
	}
	if p.BaseDelay == 0 {
		p.BaseDelay = 250 * time.Millisecond
	}
	if p.MaxDelay == 0 {
		p.MaxDelay = 5 * time.Second
	}
	if p.MaxDelay < p.BaseDelay {
		return p, fail(Configuration)
	}
	return p, nil
}

// JSON encodes a typed variant for a generated union or open native body.
func JSON(v any) (json.RawMessage, error) {
	b, e := json.Marshal(v)
	if e != nil {
		return nil, fail(InvalidRequest)
	}
	return b, nil
}
func Ptr[T any](v T) *T { return &v }
