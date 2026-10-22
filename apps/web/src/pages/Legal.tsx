import { legalPages } from "../legal-content.ts";
import "./legal.css";

export function Legal({ path }: { path: string }) {
  const page = legalPages.find(page => page.path === path)!;
  return <article className="route-page legal-page">
    <header><h1>{page.title}</h1><p className="legal-updated">Effective {page.updated}</p><p>{page.description}</p></header>
    <nav aria-label={`${page.title} contents`}><ul>{page.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ul></nav>
    {page.sections.map(section => <section key={section.id} aria-labelledby={section.id}><h2 id={section.id}>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
    <div className="legal-contact"><p>Contact <a href="mailto:info@belweave.com">info@belweave.com</a></p><nav aria-label="Related policies">{page.links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav></div>
  </article>;
}
