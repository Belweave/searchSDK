// brand/index.html: the guidelines, shown with the real assets. One self-contained file: fonts,
// SVG and PNG are inlined, so it opens from the file system with no server and no network.
import fs from 'node:fs';
import { brandCss, contrastTable, tokens, role } from './tokens.mjs';
import { MAIN, SMALL } from './geometry.mjs';
import { BANNED } from './lint.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const b64 = (buf) => Buffer.from(buf).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function page(src, get) {
  const S = (p, attrs = '') => src[p].trim().replace(/^<svg\b/, `<svg${attrs ? ' ' + attrs : ''}`);
  const both = (base, attrs = '') => `<span class="v-dark">${S(base + '-dark.svg', attrs)}</span><span class="v-light">${S(base + '-light.svg', attrs)}</span>`;
  const img = (p, alt, attrs = '') => `<img src="data:image/png;base64,${b64(get(p))}" alt="${alt}"${attrs ? ' ' + attrs : ''}>`;
  const font = (f) => `url(data:font/woff2;base64,${b64(fs.readFileSync(ROOT + 'fonts/' + f))}) format("woff2")`;
  const c = tokens.color;
  const swatch = (name, hex, sub = '') => `<li><span class="chip" style="background:${hex}"></span><b>${name}</b><code>${hex}</code>${sub ? `<code>${sub}</code>` : ''}</li>`;
  const ramp = (group, names) => `<ul class="ramp">${names.map((k) => `<li style="background:${c[group][k].$value};color:${(parseFloat(c[group][k].oklch.slice(6)) > 0.6) ? c.ink['900'].$value : c.ink['50'].$value}"><b>${k}</b><code>${c[group][k].$value}</code></li>`).join('')}</ul>`;
  const roleNames = ['surface-0', 'surface-1', 'surface-2', 'line', 'fg', 'fg-muted', 'fg-subtle', 'accent', 'accent-text', 'focus', 'ok', 'warn', 'danger', 'sample'];
  const rows = contrastTable();
  const pairs = [...new Set(rows.map((r) => `${r.fg}|${r.bg}|${r.min}`))].map((k) => {
    const [fg, bg, min] = k.split('|');
    const d = rows.find((r) => r.theme === 'dark' && r.fg === fg && r.bg === bg), l = rows.find((r) => r.theme === 'light' && r.fg === fg && r.bg === bg);
    return `<tr><td><code>${fg}</code> on <code>${bg}</code></td><td>${d.ratio.toFixed(2)}</td><td>${l.ratio.toFixed(2)}</td><td>${min}</td></tr>`;
  }).join('');
  const never = ['stretch', 'rotate', 'recolour', 'reorder', 'gradient', 'outline', 'effects', 'field', 'crop', 'redraw', 'retype', 'rename'];
  const neverCap = { stretch: 'Stretch', rotate: 'Rotate', recolour: 'Recolour', reorder: 'Reorder the bands', gradient: 'Add gradients', outline: 'Outline', effects: 'Add glow, shadow or blur', field: 'Colour mark on a brand colour', crop: 'Crop', redraw: 'Redraw or simplify', retype: 'Retype the wordmark', rename: 'Change the name' };
  const pix = (p, px, alt) => `<figure>${img(p, alt, `width="${px * 6}" height="${px * 6}" class="px"`)}<figcaption>${px} px</figcaption></figure>`;

  const css = `
@font-face{font-family:"Instrument Sans";src:${font('InstrumentSans-latin.woff2')};font-weight:400 700;font-stretch:75% 100%;font-display:block}
@font-face{font-family:"Martian Mono";src:${font('MartianMono-latin.woff2')};font-weight:100 800;font-stretch:75% 112.5%;font-display:block}
${brandCss().replace(/^\/\*.*\*\/\n/, '')}
*{box-sizing:border-box}
html{background:var(--surface-0);color:var(--fg);font:400 var(--type-base)/var(--leading-normal) var(--font-sans);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
body{margin:0}
:root[data-theme="light"] .v-dark,:root:not([data-theme="light"]) .v-light{display:none}
.v-dark,.v-light{display:contents}
a{color:var(--accent-text)}
::selection{background:var(--selection);color:#fff}
:focus-visible{outline:var(--focus-width) solid var(--focus);outline-offset:var(--focus-offset)}
code,.mono{font-family:var(--font-mono);font-size:0.8125em;font-stretch:var(--mono-stretch)}
.wrap{max-width:var(--page-max);margin:0 auto;padding:0 var(--space-gutter)}
header{display:flex;align-items:center;justify-content:space-between;height:72px;border-bottom:1px solid var(--line)}
header svg{height:32px;width:auto;display:block}
button{font:500 var(--type-sm) var(--font-sans);color:var(--fg);background:var(--surface-2);border:1px solid var(--line-strong);border-radius:var(--radius-md);padding:8px 14px;cursor:pointer;transition:background var(--duration-fast) var(--ease-standard)}
button:hover{background:var(--surface-3)}
section{padding:var(--space-section) 0;border-bottom:1px solid var(--line)}
h1{font-size:var(--type-display);line-height:var(--leading-display);letter-spacing:var(--tracking-display);font-weight:650;margin:0;text-wrap:balance}
h2{font-size:var(--type-3xl);line-height:var(--leading-tight);letter-spacing:var(--tracking-tight);font-weight:650;margin:0 0 var(--space-8)}
h3{font-size:var(--type-lg);font-weight:600;margin:var(--space-12) 0 var(--space-4)}
p{max-width:var(--measure);margin:0 0 var(--space-4);color:var(--fg-muted)}
.lead{font-size:var(--type-lead);color:var(--fg-muted);max-width:34rem;margin-top:var(--space-6)}
.hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,0.8fr);gap:var(--space-12);align-items:center}
.hero .stage svg{width:100%;height:auto;display:block}
.two{display:grid;gap:var(--space-6);grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}
.grid{display:grid;gap:var(--space-4);grid-template-columns:repeat(auto-fill,minmax(min(100%,var(--min,260px)),1fr))}
.panel{border-radius:var(--radius-lg);padding:var(--space-8);display:flex;align-items:center;justify-content:center;min-height:200px;border:1px solid var(--line)}
.panel svg,.panel img{max-width:100%;height:auto}
.on-ink{background:${c.ink['900'].$value};color:${c.ink['50'].$value}}
.on-paper{background:${c.paper['50'].$value};color:${c.ink['900'].$value}}
.on-page{background:var(--surface-1);color:var(--fg)}
.cap{font:500 var(--type-label)/1.3 var(--font-mono);letter-spacing:var(--tracking-label);color:var(--fg-subtle);margin-top:var(--space-2);font-stretch:var(--mono-stretch)}
figure{margin:0}
figcaption{font:500 var(--type-label)/1.3 var(--font-mono);color:var(--fg-subtle);margin-top:var(--space-2);font-stretch:var(--mono-stretch)}
.px{image-rendering:pixelated;display:block;background:${c.ink['900'].$value}}
.pixrow{display:flex;flex-wrap:wrap;gap:var(--space-6);align-items:flex-end}
table{border-collapse:collapse;width:100%;font-size:var(--type-sm)}
th,td{text-align:left;padding:10px 12px 10px 0;border-bottom:1px solid var(--line);vertical-align:top}
th{font:500 var(--type-label) var(--font-mono);letter-spacing:var(--tracking-label);color:var(--fg-subtle);font-stretch:var(--mono-stretch)}
td:not(:first-child){font-family:var(--font-mono);font-variant-numeric:tabular-nums;font-size:0.8125em}
.scroll{overflow-x:auto}
.swatches{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-3)}
.swatches li{display:grid;grid-template-columns:44px 1fr;column-gap:var(--space-3);align-items:center}
.swatches .chip{grid-row:span 3;width:44px;height:44px;border-radius:var(--radius-sm);border:1px solid var(--line)}
.swatches code{color:var(--fg-subtle)}
.ramp{list-style:none;margin:0 0 var(--space-4);padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr))}
.ramp li{padding:28px 8px 8px;font-size:var(--type-xs)}
.ramp b{display:block;font-weight:600}
.roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--space-3);list-style:none;padding:0;margin:0}
.roles li{border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden;background:var(--surface-1)}
.roles span{display:block;height:44px}
.roles b{display:block;padding:8px 10px 0;font:500 var(--type-xs) var(--font-mono);font-stretch:var(--mono-stretch)}
.roles code{display:block;padding:2px 10px 8px;color:var(--fg-subtle)}
.spec{color:var(--fg);max-width:none;font-size:var(--type-h2);line-height:var(--leading-tight);letter-spacing:var(--tracking-tight);font-weight:650;margin:0 0 var(--space-6)}
.readout{font:400 var(--type-readout)/1.04 var(--font-mono);font-variant-numeric:tabular-nums;letter-spacing:-0.02em}
.tag{display:inline-block;font:500 var(--type-label)/1 var(--font-mono);letter-spacing:var(--tracking-label);padding:5px 7px;border-radius:var(--radius-sm);background:var(--sample);color:var(--on-state);vertical-align:middle;margin-left:var(--space-3);font-stretch:var(--mono-stretch)}
.rules{padding-left:1.1em;max-width:var(--measure);color:var(--fg-muted)}
.rules li{margin-bottom:var(--space-2)}
.motion{display:flex;gap:var(--space-8);align-items:center;flex-wrap:wrap}
.motion .panel{width:220px;min-height:220px}
.never figure svg{width:100%;height:auto;display:block;border-radius:var(--radius-md)}
.safe{position:relative;display:inline-block}
.safe::after{content:"";position:absolute;inset:10%;border:1px dashed ${c.ink['300'].$value};border-radius:50%}
.files a{font-family:var(--font-mono);font-size:var(--type-sm);font-stretch:var(--mono-stretch)}
footer{padding:var(--space-12) 0;color:var(--fg-subtle);font-size:var(--type-sm)}
.hero .stage{max-width:420px;justify-self:end;width:100%}
@media (max-width:760px){.hero{grid-template-columns:1fr}.hero .stage{max-width:220px;justify-self:start}.two{grid-template-columns:1fr}}
.icons{display:flex;flex-wrap:wrap;gap:var(--space-8);align-items:flex-end;justify-content:center}
.card{border:1px solid var(--line);border-radius:var(--radius-lg);display:block;width:100%;height:auto}
`;

  const replay = `document.getElementById('replay').addEventListener('click',()=>{const h=document.getElementById('intro-demo');const s=h.innerHTML;h.innerHTML='';requestAnimationFrame(()=>{h.innerHTML=s})});`;
  const theme = `(function(){var k='searchsdk-brand-theme',r=document.documentElement,b=document.getElementById('theme');function set(t){if(t==='light')r.setAttribute('data-theme','light');else r.removeAttribute('data-theme');b.textContent=t==='light'?'Dark':'Light';b.setAttribute('aria-pressed',t==='light')}var t='dark';try{t=localStorage.getItem(k)||'dark'}catch(e){}set(t);b.addEventListener('click',function(){t=t==='light'?'dark':'light';set(t);try{localStorage.setItem(k,t)}catch(e){}})})();`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>searchSDK brand</title>
<meta name="description" content="The searchSDK mark, lockups, colour, type, motion and rules.">
<link rel="icon" href="data:image/svg+xml;base64,${b64(src['src/icon/favicon.svg'])}">
<style>${css}</style>
</head>
<body>
<div class="wrap">
<header>${both('src/lockup/horizontal', 'height="32" aria-label="searchSDK"').replace(/viewBox="-24 -24 ([\d.]+) 112"/g, (m, w) => `viewBox="0 0 ${(+w - 48).toFixed(3)} 64"`)}<button id="theme" type="button" aria-pressed="false">Light</button></header>

<section class="hero">
  <div>
    <h1>searchSDK brand</h1>
    <p class="lead">Signal and spectrum. Sources arrive as bands of colour and meet in one beam: apricot and cyan are the sources, violet is where they meet, and the cut is the beam.</p>
  </div>
  <div class="stage" id="intro">${both('src/motion/mark-intro')}</div>
</section>

<section id="mark">
  <h2>Mark</h2>
  <div class="two">
    <figure class="panel on-ink">${S('src/guide/construction.svg')}</figure>
    <div>
      <table>
        <tr><th>Part</th><th>Construction, 64-unit grid</th></tr>
        <tr><td>Bands</td><td>apricot 0–22 · beam 22–46 · cyan 46–64</td></tr>
        <tr><td>Left edge</td><td>arc through 24,0 · 12,22 · 0,64, r ${MAIN.arc.r.toFixed(1)}</td></tr>
        <tr><td>Beam</td><td>apex 12,40 below the arc at 12,22; upper edge 1:2, lower edge 1:4</td></tr>
        <tr><td>Cyan edge</td><td>1:2, parallel to the beam's upper edge</td></tr>
        <tr><td>Small master</td><td>16-unit grid, bands 6 · 6 · 4, apex 3,10; below 32 px and at 48 px</td></tr>
      </table>
    </div>
  </div>
  <h3>Pixel fit</h3>
  <div class="pixrow">${pix('dist/mark/mark-dark-16.png', 16, 'Mark at 16 px')}${pix('dist/mark/mark-dark-24.png', 24, 'Mark at 24 px')}${pix('dist/mark/mark-dark-32.png', 32, 'Mark at 32 px')}${pix('dist/mark/mark-light-16.png', 16, 'Light mark at 16 px').replace('class="px"', 'class="px" style="background:' + c.paper['50'].$value + '"')}${pix('dist/mark/mark-light-32.png', 32, 'Light mark at 32 px').replace('class="px"', 'class="px" style="background:' + c.paper['50'].$value + '"')}</div>
</section>

<section id="lockups">
  <h2>Lockups</h2>
  <div class="grid" style="--min:300px">
    <figure><div class="panel on-ink">${S('src/lockup/horizontal-dark.svg', 'width="300"')}</div><figcaption>horizontal-dark</figcaption></figure>
    <figure><div class="panel on-paper">${S('src/lockup/horizontal-light.svg', 'width="300"')}</div><figcaption>horizontal-light</figcaption></figure>
    <figure><div class="panel on-page">${S('src/lockup/horizontal-mono.svg', 'width="300"')}</div><figcaption>horizontal-mono</figcaption></figure>
    <figure><div class="panel on-ink">${S('src/lockup/stacked-dark.svg', 'width="200"')}</div><figcaption>stacked-dark</figcaption></figure>
    <figure><div class="panel on-paper">${S('src/lockup/stacked-light.svg', 'width="200"')}</div><figcaption>stacked-light</figcaption></figure>
    <figure><div class="panel on-page">${S('src/lockup/stacked-mono.svg', 'width="200"')}</div><figcaption>stacked-mono</figcaption></figure>
    <figure><div class="panel on-ink">${S('src/lockup/icon-dark.svg', 'width="110"')}</div><figcaption>icon-dark</figcaption></figure>
    <figure><div class="panel on-paper">${S('src/lockup/icon-light.svg', 'width="110"')}</div><figcaption>icon-light</figcaption></figure>
    <figure><div class="panel on-page">${S('src/lockup/icon-mono.svg', 'width="110"')}</div><figcaption>icon-mono</figcaption></figure>
  </div>
  <h3>Clear space and size</h3>
  <p>Clear space is the beam, 3/8 of the mark's height, on every side. The x-height spans the beam; the gap is the cyan band.</p>
  <div class="two">
    <figure class="panel on-ink">${S('src/guide/clearspace-horizontal.svg')}</figure>
    <div>
      <table>
        <tr><th>Minimum</th><th>Size</th></tr>
        <tr><td>Mark</td><td>16 px</td></tr>
        <tr><td>Horizontal lockup</td><td>mark 20 px tall</td></tr>
        <tr><td>Stacked lockup</td><td>mark 40 px tall</td></tr>
        <tr><td>Print</td><td>mark 6 mm</td></tr>
      </table>
      <p style="margin-top:var(--space-6)">Colour mark on ink or paper only. Anywhere else: one colour, or the app icon tile.</p>
    </div>
  </div>
</section>

<section id="colour">
  <h2>Colour</h2>
  <div class="two">
    <div class="panel on-ink" style="justify-content:flex-start"><ul class="swatches" style="color:${c.ink['50'].$value}">${['apricot', 'violet', 'cyan'].map((k) => swatch(k[0].toUpperCase() + k.slice(1), c.brand[k].$value, c.brand[k].oklch)).join('')}</ul></div>
    <div class="panel on-paper" style="justify-content:flex-start"><ul class="swatches" style="color:${c.ink['900'].$value}">${['apricot', 'violet', 'cyan'].map((k) => swatch(k[0].toUpperCase() + k.slice(1) + ' on paper', c['brand-paper'][k].$value, c['brand-paper'][k].oklch)).join('')}</ul></div>
  </div>
  <p style="margin-top:var(--space-6)">Flat fills, hard edges, never a gradient between them. Brand colours never encode data; provider hues never decorate. Each provider keeps a hue derived from its own brand colour, always shown with its logo and name; those values belong to the website.</p>
  <h3>Ink and paper</h3>
  ${ramp('ink', ['50', '100', '200', '300', '400', '500', '600', '700', '750', '800', '850', '900', '950', '1000'])}
  ${ramp('paper', ['0', '50', '100', '200', '300', '400'])}
  <h3>Roles, this theme</h3>
  <ul class="roles">${roleNames.map((k) => `<li><span style="background:var(--${k})"></span><b>${k}</b><code><span class="v-dark">${role('dark', k)}</span><span class="v-light">${role('light', k)}</span></code></li>`).join('')}</ul>
  <h3>Contrast, checked</h3>
  <div class="scroll"><table><tr><th>Pair</th><th>Dark</th><th>Light</th><th>Min</th></tr>${pairs}</table></div>
</section>

<section id="type">
  <h2>Type</h2>
  <p class="spec">One interface to web search providers</p>
  <p>Instrument Sans for headings and prose; Martian Mono for code, numbers, units and benchmark figures. Both SIL Open Font License 1.1. Instrument Sans replaces Bricolage Grotesque: its straight-armed K repeats the mark's cut and its flat terminals match the bands.</p>
  <p class="readout">412 ms<span class="tag">Sample data</span></p>
  <div class="scroll"><table>
    <tr><th>Token</th><th>Size</th><th>Weight</th><th>Leading</th></tr>
    <tr><td><span style="font:650 2rem/1 var(--font-sans);letter-spacing:var(--tracking-display)">Display</span></td><td>${tokens.type.size.display}</td><td>650</td><td>0.94</td></tr>
    <tr><td><span style="font:650 1.5rem/1 var(--font-sans);letter-spacing:var(--tracking-tight)">Heading</span></td><td>${tokens.type.size.h2}</td><td>650</td><td>1.04</td></tr>
    <tr><td><span style="font-size:var(--type-lead)">Lead</span></td><td>${tokens.type.size.lead}</td><td>400</td><td>1.6</td></tr>
    <tr><td>Body</td><td>1rem</td><td>400</td><td>1.6</td></tr>
    <tr><td><span class="mono">label</span></td><td>0.6875rem, width 87.5%</td><td>500</td><td>1.3</td></tr>
  </table></div>
</section>

<section id="motion">
  <h2>Motion</h2>
  <p>Motion shows data arriving and state changing. Sources travel right to left, into the beam. Under reduced motion every loop stops on its finished frame.</p>
  <div class="motion">
    <figure><div class="panel on-ink">${S('src/motion/mark-loader-dark.svg', 'width="140"')}</div><figcaption>mark-loader · 2400 ms loop</figcaption></figure>
    <figure><div class="panel on-ink" id="intro-demo">${S('src/motion/mark-intro-dark.svg', 'width="140"')}</div><figcaption>mark-intro · 600 ms once</figcaption></figure>
    <button id="replay" type="button">Replay intro</button>
  </div>
  <div class="scroll" style="margin-top:var(--space-8)"><table>
    <tr><th>Token</th><th>Value</th></tr>
    ${Object.entries(tokens.motion.duration).map(([k, v]) => `<tr><td><code>duration-${k}</code></td><td>${v}</td></tr>`).join('')}
    ${Object.entries(tokens.motion.easing).map(([k, v]) => `<tr><td><code>ease-${k}</code></td><td>${v}</td></tr>`).join('')}
  </table></div>
</section>

<section id="icons">
  <h2>Icons and cards</h2>
  <div class="two">
    <div class="panel" style="background:${c.ink['700'].$value}"><div class="icons">
      <figure>${img('dist/icon/app-icon-512.png', 'App icon', 'width="128" height="128"')}<figcaption style="color:${c.ink['200'].$value}">app-icon</figcaption></figure>
      <figure>${img('dist/icon/apple-touch-icon.png', 'Apple touch icon', 'width="90" height="90"')}<figcaption style="color:${c.ink['200'].$value}">apple-touch · 180</figcaption></figure>
      <figure class="safe">${img('dist/icon/icon-maskable-512.png', 'Maskable icon with its safe zone', 'width="90" height="90"')}<figcaption style="color:${c.ink['200'].$value}">maskable</figcaption></figure>
    </div></div>
    <div class="panel on-paper"><div class="icons">
      <figure>${img('dist/icon/app-icon-512.png', 'App icon on paper', 'width="128" height="128"')}<figcaption style="color:${c.ink['600'].$value}">app-icon</figcaption></figure>
      <figure>${img('dist/mark/mark-light-32.png', 'Favicon at 32 px', 'width="32" height="32"')}<figcaption style="color:${c.ink['600'].$value}">favicon 32</figcaption></figure>
      <figure>${img('dist/mark/mark-light-16.png', 'Favicon at 16 px', 'width="16" height="16"')}<figcaption style="color:${c.ink['600'].$value}">16</figcaption></figure>
    </div></div>
  </div>
  <div class="two" style="margin-top:var(--space-6)">
    <figure>${img('dist/social/og.png', 'Open Graph card', 'width="1200" height="630" class="card"')}<figcaption>og · 1200 × 630</figcaption></figure>
    <figure>${img('dist/social/github.png', 'GitHub social preview', 'width="1280" height="640" class="card"')}<figcaption>github · 1280 × 640</figcaption></figure>
  </div>
</section>

<section id="voice">
  <h2>Voice</h2>
  <ul class="rules">
    <li>The name is always searchSDK.</li>
    <li>Say what it does, in plain words. One idea per sentence.</li>
    <li>Word caps: hero 30, home page 150, docs page 300 outside code, card headline 8.</li>
    <li>Back every claim where it is made: a benchmark figure links its run, date and method.</li>
    <li>Sample data carries a <span class="tag" style="margin:0">Sample data</span> tag; an unverified fact carries <span class="tag" style="margin:0;background:var(--warn)">Unverified</span>.</li>
    <li>Banned: <!-- lint-ignore -->${BANNED.join(', ')}.</li>
  </ul>
</section>

<section id="providers">
  <h2>Provider logos</h2>
  <ul class="rules">
    <li>Each provider's official files, unmodified, under its own rules, with the source recorded.</li>
    <li>Never recoloured, redrawn, animated, cropped or given effects; never larger than the searchSDK mark.</li>
    <li>Logos identify providers in comparisons. They never imply endorsement, partnership or affiliation.</li>
    <li>Pages that name providers say the names are their owners' trademarks and that searchSDK is not affiliated with them.</li>
  </ul>
</section>

<section id="never">
  <h2>Never</h2>
  <div class="grid never" style="--min:150px">${never.map((k) => `<figure>${S(`src/never/${k}.svg`)}<figcaption>${neverCap[k]}</figcaption></figure>`).join('')}</div>
</section>

<section id="files" class="files">
  <h2>Files</h2>
  <p>Rebuild with <code>npm run build</code> in <code>brand/</code>; <code>npm run check</code> fails if anything is stale.</p>
  <ul class="rules">
    <li><a href="src/mark/">src/mark/</a> · <a href="src/wordmark/">src/wordmark/</a> · <a href="src/lockup/">src/lockup/</a> · <a href="src/icon/">src/icon/</a> · <a href="src/motion/">src/motion/</a> · <a href="src/social/">src/social/</a></li>
    <li><a href="dist/">dist/</a> · <a href="tokens.json">tokens.json</a> · <a href="tokens.css">tokens.css</a> · <a href="tokens.site.css">tokens.site.css</a> · <a href="GUIDELINES.md">GUIDELINES.md</a></li>
  </ul>
</section>
<footer>searchSDK · MIT. Provider names are trademarks of their owners.</footer>
</div>
<script>${theme}${replay}</script>
</body>
</html>
`;
  return html;
}
