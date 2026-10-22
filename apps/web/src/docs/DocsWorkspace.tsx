import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { WorkspaceDitherField, workspaceDitherStyles } from "../components/WorkspaceDither";
import { DocsMotif } from "./DocsMotif.js";
import { CodeBlock } from "./CodeBlock.js";
import { docArticles, docGroups, findArticle, searchArticles } from "./content.js";
import type { DocArticle, DocBlock } from "./model.js";
import { docHref } from "./model.js";
import { useMounted } from "./useMounted.js";
import "./docs.css";

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\((?:https:\/\/|\/)[^)]+\))/g);
  return <>{parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\(((?:https:\/\/|\/)[^)]+)\)$/);
    return link ? <a key={index} href={link[2]}>{link[1]}</a> : <Fragment key={index}>{part}</Fragment>;
  })}</>;
}

function Block({ block }: { block: DocBlock }): ReactNode {
  switch (block.type) {
    case "paragraph": return <p><Inline text={block.text} /></p>;
    case "code": return <CodeBlock {...block} />;
    case "list": { const List = block.ordered ? "ol" : "ul"; return <List>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</List>; }
    case "callout": return <aside className="dw-callout" data-tone={block.tone ?? "note"}><span aria-hidden="true">{block.tone === "caution" ? "!" : "i"}</span><div><strong>{block.title}</strong><p><Inline text={block.text} /></p></div></aside>;
    case "table": return <DocTable block={block} />;
    case "links": return <ul className="dw-link-list">{block.items.map(item => <li key={item.href}><a href={item.href}><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span><span aria-hidden="true">↗</span></a></li>)}</ul>;
  }
}

function DocTable({ block }: { block: Extract<DocBlock, { type: "table" }> }) {
  const ready = useMounted();
  const filterInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const id = useId();
  const operations = block.columns[0] === "Method";
  const searchable = operations && block.rows.length > 12;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = searchable && terms.length ? block.rows.filter(row => terms.every(term => row.join(" ").toLowerCase().includes(term))) : block.rows;
  return <div className="dw-table-block">
    {searchable && <div className="dw-operation-filter"><label htmlFor={id}>Find an operation</label><div className="dw-operation-input"><input ref={filterInput} id={id} type="search" disabled={!ready} value={query} onChange={event => setQuery(event.target.value)} placeholder="Method, path, or response…" autoComplete="off" aria-controls={`${id}-table`} /><span role="status">{rows.length} / {block.rows.length}</span></div></div>}
    <div className="dw-table" tabIndex={0} role="region" aria-label={`${operations ? "Native operations" : block.columns.join(" and ")} table — scroll horizontally for more`}><table id={`${id}-table`} className={operations ? "dw-operations-table" : undefined}><thead><tr>{block.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}><Inline text={cell} /></th> : <td key={j}><Inline text={cell} /></td>)}</tr>)}</tbody></table></div>
    {searchable && rows.length === 0 && <p className="dw-operation-empty">No operations match “{query}”. <button type="button" disabled={!ready} onClick={event => { const restoreFocus = document.activeElement === event.currentTarget; setQuery(""); if (restoreFocus) filterInput.current?.focus({ preventScroll: true }); }}>Clear search</button></p>}
  </div>;
}

function Sidebar({ article, mobile = false }: { article?: DocArticle; mobile?: boolean }) {
  return <nav aria-label={mobile ? "Mobile documentation navigation" : "Documentation navigation"} className="dw-navigation">
    {docGroups.map(group => <div className="dw-nav-group" key={group}><h2>{group}<WorkspaceDitherField className="dw-nav-dither" /></h2><ul>{docArticles.filter(item => item.group === group).map(item => <li key={item.slug}><a href={docHref(item.slug)} aria-current={article?.slug === item.slug ? "page" : undefined}>{item.label ?? item.title}{item.slug === "providers/context" || item.slug === "providers/tinyfish" ? <span className="dw-nav-dot" aria-label="Priority provider" /> : null}</a></li>)}</ul></div>)}
  </nav>;
}

function SearchDialog({ open, close, initialQuery }: { open: boolean; close: () => void; initialQuery: string }) {
  const ready = useMounted();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const results = searchArticles(query);
  const resultRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    const previous = document.activeElement as HTMLElement | null;
    setQuery(initialQuery); setSelected(0);
    if (!dialog.current?.open) dialog.current?.showModal();
    input.current?.focus();
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; previous?.focus(); };
  }, [open, initialQuery]);
  useEffect(() => { resultRef.current?.children[selected]?.scrollIntoView({ block: "nearest" }); }, [selected, query]);
  return <dialog ref={dialog} className="dw-search-dialog" aria-labelledby="dw-search-title" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    if (event.shiftKey && document.activeElement === input.current) { event.preventDefault(); closeButton.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === closeButton.current) { event.preventDefault(); input.current?.focus(); }
  }} onClick={event => { if (event.target === dialog.current) close(); }}>
    <div className="dw-search-panel">
      <div className="dw-search-input-row"><span aria-hidden="true">⌕</span><label className="dw-sr-only" id="dw-search-title" htmlFor="dw-search-input">Search documentation</label><input id="dw-search-input" ref={input} disabled={!ready} value={query} autoComplete="off" placeholder="Search documentation…" role="combobox" aria-expanded={open} aria-controls="dw-search-results" aria-autocomplete="list" aria-activedescendant={results[selected] ? `dw-search-result-${selected}` : undefined} onChange={event => { setQuery(event.target.value); setSelected(0); }} onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setSelected(current => results.length ? (current + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0); }
        if (event.key === "Enter" && results[selected]) { event.preventDefault(); window.location.assign(results[selected].href); }
      }} /><button ref={closeButton} type="button" disabled={!ready} onClick={close} aria-label="Close documentation search">Esc</button></div>
      <div className="dw-search-count" role="status">{query.trim() ? `${results.length} matching ${results.length === 1 ? "article" : "articles"}` : "Start with a guide"}</div>
      <ul ref={resultRef} id="dw-search-results" className="dw-search-results" role="listbox" tabIndex={-1} aria-label="Documentation search results">{results.map((result, index) => <li key={result.article.slug} role="presentation"><a id={`dw-search-result-${index}`} role="option" tabIndex={-1} aria-selected={selected === index} href={result.href} onMouseDown={event => { if (event.button === 0) event.preventDefault(); setSelected(index); }} onMouseMove={() => setSelected(index)}><small>{result.article.group}{result.section ? ` / ${result.article.label ?? result.article.title}` : ""}</small><strong>{result.section?.title ?? result.article.label ?? result.article.title}<span aria-hidden="true">↗</span></strong><p>{result.excerpt}</p></a></li>)}</ul>
      {results.length === 0 && <div className="dw-search-empty"><WorkspaceDitherField variant="dotted" /><strong>No matching articles</strong><p>Try a provider name, “fallback”, “usage”, or “AbortSignal”.</p></div>}
      <div className="dw-search-help"><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>
    </div>
  </dialog>;
}

export function DocsWorkspace({ path }: { path?: string }) {
  const ready = useMounted();
  const pathname = path ?? (typeof window === "undefined" ? "/docs" : window.location.pathname);
  const article = findArticle(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState(article?.sections[0]?.id ?? "");
  const index = article ? docArticles.indexOf(article) : -1;
  const previous = index > 0 ? docArticles[index - 1] : undefined;
  const next = index >= 0 ? docArticles[index + 1] : undefined;
  useEffect(() => {
    document.title = `${article?.label ?? article?.title ?? "Page not found"} · searchSDK Docs`;
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.altKey) { event.preventDefault(); setSearchOpen(value => !value); }
    };
    document.addEventListener("keydown", listener);
    const openSearch = (event: Event) => {
      event.preventDefault();
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
      const query = typeof detail === "string" ? detail : detail && typeof detail === "object" && "query" in detail && typeof detail.query === "string" ? detail.query : "";
      setSearchQuery(query); setSearchOpen(true);
    };
    window.addEventListener("searchsdk:open-docs-search", openSearch);
    return () => { document.removeEventListener("keydown", listener); window.removeEventListener("searchsdk:open-docs-search", openSearch); };
  }, [article]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("search")) { setSearchQuery(params.get("search") ?? ""); setSearchOpen(true); }
  }, []);
  useEffect(() => {
    setActiveSection(article?.sections[0]?.id ?? "");
    if (!article || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      const current = [...visible].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (current) setActiveSection(current.id);
    }, { rootMargin: "-12% 0px -58% 0px", threshold: 0 });
    article.sections.forEach(section => { const element = document.getElementById(section.id); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [article]);

  return <div className="dw-workspace" style={workspaceDitherStyles}>
    <a className="dw-skip" href="#dw-article">Skip to article</a>
    <div className="dw-mobile-navigation"><details className="dw-mobile-nav"><summary>Browse documentation <span aria-hidden="true">＋</span></summary><Sidebar article={article} mobile /></details><button className="dw-mobile-search" type="button" disabled={!ready} aria-label="Search documentation" onClick={() => { setSearchQuery(""); setSearchOpen(true); }}><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg></button></div>
    <div className="dw-layout"><aside className="dw-sidebar"><DocsMotif /><Sidebar article={article} /></aside>
      <article id="dw-article" className="dw-article" tabIndex={-1}>
        {article ? <><nav className="dw-breadcrumbs" aria-label="Breadcrumb"><a href="/docs">Docs</a><span aria-hidden="true">/</span><span>{article.group}</span><a className="dw-markdown-link" href={`${docHref(article.slug)}.md`} aria-label="View this article as Markdown">Markdown <span aria-hidden="true">↗</span></a></nav><header className="dw-article-header"><h1>{article.title}</h1><p>{article.description}</p><WorkspaceDitherField className="dw-header-dither" /></header>
          <details className="dw-mobile-toc"><summary>On this page</summary><nav aria-label="On this page (mobile)">{article.sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}</nav></details>
          {article.sections.map((section, sectionIndex) => <section className="dw-section" id={section.id} key={section.id}><div className="dw-chapter-dither" aria-hidden="true"><span>{String(sectionIndex + 1).padStart(2, "0")}</span><WorkspaceDitherField /></div><h2><a href={`#${section.id}`}>{section.title}<span aria-hidden="true">#</span></a></h2>{section.blocks.map((block, i) => <Block block={block} key={i} />)}</section>)}
          <footer className="dw-article-footer"><nav className="dw-pagination" aria-label="Previous and next articles">{previous ? <a href={docHref(previous.slug)}><small>← Previous</small><strong>{previous.label ?? previous.title}</strong></a> : <span />}{next && <a href={docHref(next.slug)}><small>Next →</small><strong>{next.label ?? next.title}</strong></a>}</nav></footer>
        </> : <><nav className="dw-breadcrumbs" aria-label="Breadcrumb"><a href="/docs">Docs</a><span aria-hidden="true">/</span><span>Not found</span></nav><header className="dw-article-header"><span className="dw-kicker">404 / DOCUMENTATION</span><h1>This page isn’t in the index.</h1><p>The article may have moved, or the address may be incomplete. Browse the navigation or search the documentation.</p></header><button className="dw-not-found-search" type="button" disabled={!ready} onClick={() => setSearchOpen(true)}>Search documentation <kbd>⌘ K</kbd></button><Block block={{ type: "links", items: [{ label: "Documentation introduction", href: "/docs" }, { label: "Quickstart", href: "/docs/quickstart" }, { label: "Provider reference", href: "/docs/providers" }] }} /></>}
      </article>
      {article && <aside className="dw-toc"><nav aria-label="On this page"><h2>On this page</h2>{article.sections.map(section => <a href={`#${section.id}`} key={section.id} aria-current={activeSection === section.id ? "location" : undefined}>{section.title}</a>)}</nav><a className="dw-toc-bottom" href="/docs/reliability/verification">Verification and limits <span aria-hidden="true">↗</span></a></aside>}
    </div><SearchDialog open={searchOpen} initialQuery={searchQuery} close={() => setSearchOpen(false)} />
  </div>;
}

export default DocsWorkspace;
