package searchsdk

import (
	"bufio"
	"compress/gzip"
	"context"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"unicode/utf8"
)

// SSEEvent preserves native data text; it never assumes JSON payloads.
type SSEEvent struct {
	Event string
	Data  string
	ID    *string
	Retry *int64
}

// SSEStream has one sequential reader. Always Close when stopping early, even
// before the first Next. Deadline/cancellation also closes and releases it.
type SSEStream struct {
	ctx           context.Context
	body          io.ReadCloser
	reader        *bufio.Reader
	closeOnce     sync.Once
	readMu        sync.Mutex
	finish        func()
	stop          func() bool
	stopMu        sync.Mutex
	skipLF, first bool
	lastID        *string
	ended         bool // protected by readMu
}
type cappedReader struct {
	r         io.Reader
	remaining int64
}

func (c *cappedReader) Read(p []byte) (int, error) {
	if c.remaining < 0 {
		return 0, fail(InvalidResponse)
	}
	if int64(len(p)) > c.remaining+1 {
		p = p[:c.remaining+1]
	}
	n, e := c.r.Read(p)
	c.remaining -= int64(n)
	if c.remaining < 0 {
		return 0, fail(InvalidResponse)
	}
	return n, e
}
func newSSE(ctx context.Context, resp *http.Response, limit int64, finish func()) (*SSEStream, error) {
	if strings.ToLower(strings.TrimSpace(strings.Split(resp.Header.Get("Content-Type"), ";")[0])) != "text/event-stream" {
		resp.Body.Close()
		return nil, fail(InvalidResponse)
	}
	setupStop := context.AfterFunc(ctx, func() { resp.Body.Close() })
	defer setupStop()
	var r io.Reader = resp.Body
	if enc := strings.ToLower(resp.Header.Get("Content-Encoding")); enc != "" && enc != "identity" {
		if enc != "gzip" {
			resp.Body.Close()
			return nil, fail(InvalidResponse)
		}
		g, e := gzip.NewReader(resp.Body)
		if e != nil {
			resp.Body.Close()
			return nil, fail(InvalidResponse)
		}
		r = g
	}
	s := &SSEStream{ctx: ctx, body: resp.Body, reader: bufio.NewReader(&cappedReader{r: r, remaining: limit}), finish: finish, first: true}
	// The cancellation callback only closes the body. Next and Close own release,
	// while a deadline releases an unconsumed stream as well.
	s.stopMu.Lock()
	s.stop = context.AfterFunc(ctx, func() { s.Close() })
	s.stopMu.Unlock()
	return s, nil
}
func (s *SSEStream) Close() error {
	s.closeOnce.Do(func() {
		s.stopMu.Lock()
		stop := s.stop
		s.stopMu.Unlock()
		if stop != nil {
			stop()
		}
		s.body.Close()
		s.finish()
	})
	return nil
}
func (s *SSEStream) line() (string, error) {
	var b []byte
	for {
		c, e := s.reader.ReadByte()
		if e != nil {
			return "", e
		}
		if s.skipLF {
			s.skipLF = false
			if c == '\n' {
				continue
			}
		}
		if c == '\r' || c == '\n' {
			s.skipLF = c == '\r'
			if !utf8.Valid(b) {
				return "", fail(InvalidResponse)
			}
			line := string(b)
			if s.first {
				line = strings.TrimPrefix(line, "\ufeff")
				s.first = false
			}
			return line, nil
		}
		b = append(b, c)
	}
}

// Next returns io.EOF after a clean end. Incomplete final events are discarded.
// Streams never reconnect, replay, or retry after subscription establishment.
func (s *SSEStream) Next() (SSEEvent, error) {
	s.readMu.Lock()
	defer s.readMu.Unlock()
	if s.ended {
		return SSEEvent{}, io.EOF
	}
	var event SSEEvent
	data := []string{}
	for {
		if s.ctx.Err() != nil {
			s.Close()
			return SSEEvent{}, contextError(s.ctx)
		}
		line, e := s.line()
		if e != nil {
			ctxErr := s.ctx.Err()
			var ce *Error
			if ctxErr != nil {
				ce = contextError(s.ctx)
			}
			s.Close()
			if ce != nil {
				return SSEEvent{}, ce
			}
			if e == io.EOF {
				s.ended = true
				return SSEEvent{}, io.EOF
			}
			if se, ok := e.(*Error); ok {
				return SSEEvent{}, se
			}
			return SSEEvent{}, fail(Network)
		}
		if line == "" {
			if len(data) > 0 {
				event.Data = strings.Join(data, "\n")
				if s.lastID != nil {
					id := *s.lastID
					event.ID = &id
				}
				return event, nil
			}
			event = SSEEvent{}
			continue
		}
		if strings.HasPrefix(line, ":") {
			continue
		}
		name, value, ok := strings.Cut(line, ":")
		if !ok {
			value = ""
		}
		value = strings.TrimPrefix(value, " ")
		switch name {
		case "data":
			data = append(data, value)
		case "event":
			event.Event = value
		case "id":
			if !strings.ContainsRune(value, 0) {
				id := value
				s.lastID = &id
			}
		case "retry":
			valid := value != ""
			for _, r := range value {
				if r < '0' || r > '9' {
					valid = false
				}
			}
			if n, e := strconv.ParseInt(value, 10, 64); valid && e == nil && n <= 1<<53-1 {
				event.Retry = &n
			}
		}
	}
}
