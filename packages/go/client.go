package searchsdk

import (
	"context"
	"sync"
	"time"
)

// Config selects a primary provider and an explicit, ordered fallback chain.
// Cache and in-flight deduplication are intentionally not part of this alpha.
type Config struct {
	Provider       Provider
	Fallback       []Provider
	Timeout        time.Duration
	AttemptTimeout time.Duration
	Retry          RetryPolicy
	MaxConcurrency int
}
type Client struct {
	providers               []Provider
	timeout, attemptTimeout time.Duration
	retry                   RetryPolicy
	slots                   chan struct{}
}

func New(c Config) (*Client, error) {
	if c.Timeout < 0 || c.AttemptTimeout < 0 || c.MaxConcurrency < 0 || c.MaxConcurrency > 64 {
		return nil, fail(Configuration)
	}
	if c.Timeout == 0 {
		c.Timeout = defaultTimeout
	}
	if c.AttemptTimeout == 0 {
		c.AttemptTimeout = c.Timeout
	}
	if c.MaxConcurrency == 0 {
		c.MaxConcurrency = 8
	}
	retry, e := normalizeRetry(c.Retry)
	if e != nil {
		return nil, e
	}
	ps := append([]Provider{c.Provider}, c.Fallback...)
	if len(ps) > 64 {
		return nil, fail(Configuration)
	}
	for _, p := range ps {
		if absent(p) || !providerPattern.MatchString(p.ID()) {
			return nil, fail(Configuration)
		}
		cp := p.Capabilities()
		if cp.MaxIncludeDomains < 0 || cp.MaxExcludeDomains < 0 || cp.MaxQueryLength < 0 {
			return nil, fail(Configuration)
		}
	}
	return &Client{providers: ps, timeout: c.Timeout, attemptTimeout: c.AttemptTimeout, retry: retry, slots: make(chan struct{}, c.MaxConcurrency)}, nil
}
func (c *Client) Search(ctx context.Context, input Request) (Response, error) {
	var zero Response
	r, e := ValidateRequest(input)
	if e != nil {
		return zero, e
	}
	for _, p := range c.providers {
		if e = checkCapabilities(r, p.Capabilities()); e != nil {
			return zero, e
		}
	}
	ctx, cancel := context.WithTimeout(ctx, c.timeout)
	defer cancel()
	if ctx.Err() != nil {
		return zero, contextError(ctx)
	}
	select {
	case c.slots <- struct{}{}:
		defer func() { <-c.slots }()
	case <-ctx.Done():
		return zero, contextError(ctx)
	}
	attempts := []Attempt{}
	finish := func(e *Error) (Response, error) { e.Attempts = append([]Attempt{}, attempts...); return zero, e }
	for pi, p := range c.providers {
		for ri := 0; ; ri++ {
			if ctx.Err() != nil {
				return finish(contextError(ctx))
			}
			started := time.Now()
			attemptCtx, attemptCancel := context.WithTimeout(ctx, c.attemptTimeout)
			data, err := p.Search(attemptCtx, r)
			if ctx.Err() != nil {
				err = contextError(ctx)
			} else if attemptCtx.Err() != nil {
				err = fail(AttemptTimeout)
			} else if err == nil {
				err = validateProvider(data)
			}
			attemptCancel()
			a := Attempt{Provider: p.ID(), StartedAt: started.UTC().Format(time.RFC3339Nano), DurationMS: float64(time.Since(started)) / float64(time.Millisecond)}
			if err == nil {
				a.Outcome = "success"
				attempts = append(attempts, a)
				if len(data.Results) > r.Limit {
					data.Results = data.Results[:r.Limit]
				}
				// Copy collection headers to avoid appending into custom-provider storage.
				data.Warnings = append([]Warning{}, data.Warnings...)
				if pi > 0 {
					data.Warnings = append(data.Warnings, Warning{Code: "fallback_used", Provider: p.ID()})
				}
				return Response{ProviderResponse: data, Provider: p.ID(), Attempts: attempts}, nil
			}
			se := cleanError(err)
			a.Outcome = "error"
			a.Code = se.Code
			a.Status = se.Status
			a.RetryAfterMS = se.RetryAfterMS
			attempts = append(attempts, a)
			if !transient(se.Code) {
				return finish(se)
			}
			if ri < c.retry.MaxRetries {
				if err = retryWait(ctx, c.retry, ri, se); err != nil {
					return finish(cleanError(err))
				}
				continue
			}
			if pi == len(c.providers)-1 {
				return finish(se)
			}
			break
		}
	}
	return finish(fail(ProviderError))
}

// Searcher is implemented by Client and Gateway.
type Searcher interface {
	Search(context.Context, Request) (Response, error)
}
type BatchOptions struct {
	Concurrency int
	Timeout     time.Duration
}
type BatchResult struct {
	Index int
	Value *Response
	Error *Error
}

// SearchBatch returns ordered, independent outcomes. Queueing counts against the
// whole batch deadline. A canceled queued item is never dispatched.
func SearchBatch(ctx context.Context, s Searcher, requests []Request, o BatchOptions) ([]BatchResult, error) {
	if s == nil || o.Concurrency < 0 || o.Concurrency > 64 || o.Timeout < 0 {
		return nil, fail(Configuration)
	}
	if o.Concurrency == 0 {
		o.Concurrency = 4
	}
	if o.Timeout == 0 {
		o.Timeout = defaultTimeout
		switch v := s.(type) {
		case *Client:
			o.Timeout = v.timeout
		case *Gateway:
			o.Timeout = v.wire.timeout
		}
	}
	ctx, cancel := context.WithTimeout(ctx, o.Timeout)
	defer cancel()
	out := make([]BatchResult, len(requests))
	var wg sync.WaitGroup
	jobs := make(chan int)
	for w := 0; w < o.Concurrency; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				out[i].Index = i
				if ctx.Err() != nil {
					out[i].Error = contextError(ctx)
					continue
				}
				v, e := s.Search(ctx, requests[i])
				if e != nil {
					out[i].Error = cleanError(e)
				} else {
					out[i].Value = &v
				}
			}
		}()
	}
	for i := range requests {
		jobs <- i
	}
	close(jobs)
	wg.Wait()
	return out, nil
}
