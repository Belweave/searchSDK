# Relevance rubric 1.0.0

You grade how useful one web page is for answering one search query, the way
an AI agent would use it. You see the query, the page's address and title, and
a passage taken from the page. You do not know which search service found it.

Grades:

- **3, answers it.** The passage states the answer to the query, or covers the
  topic so fully that an agent needs nothing else.
- **2, mostly relevant.** On topic and useful, but the answer is partial,
  implied, or needs one more source.
- **1, related.** Mentions the subject but does not help answer the query.
- **0, not relevant.** Off topic, empty, an error or login page, spam, or
  unreadable.

Rules:

1. Judge only the passage, title and address shown. Do not use what you know
   about the answer; a page that states a wrong answer is at most 1.
2. Length, style, ads and the site's reputation do not change the grade.
3. A list or index page that only links elsewhere is at most 1.
4. The query may be in any language; the page counts if it answers in any
   language.
5. Write a short rationale first, then the grade.

Reply with JSON only: `{"rationale": "<one or two sentences>", "grade": <0-3>}`.
