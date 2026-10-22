import { Component, type ReactNode } from "react";

interface WorkspaceBoundaryProps {
  title: string;
  markdownHref?: string;
  children: ReactNode;
}

/** Keep a rejected workspace import from taking down the surrounding shell. */
export class WorkspaceBoundary extends Component<WorkspaceBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="route-page workspace-recovery" aria-labelledby="workspace-recovery-title">
      <h1 id="workspace-recovery-title">{this.props.title} couldn’t load.</h1>
      <p>Reload the page to try again.{this.props.markdownHref && " You can also read this page as Markdown."}</p>
      <nav className="workspace-recovery-actions" aria-label="Page recovery">
        <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        {this.props.markdownHref && <a href={this.props.markdownHref}>Read Markdown</a>}
        <a href="/docs">Documentation</a>
        <a href="/">Home</a>
      </nav>
    </section>;
  }
}
