"""Build a self-contained, offline Russian OpenChamber documentation reader.

Does not modify the translation sources. Requires pandoc in PATH.

The layout mirrors the published docs site (Astro Starlight with OpenChamber's
theme): fixed header, section sidebar, article column and "On this page" rail.
"""
from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCE = HERE / 'content' / 'docs' / 'ru'
OUTPUT = HERE / 'OpenChamber_RU_Reader.html'

TOTAL_PAGES = 62


def route_slug(route: str) -> str:
    return route.strip('/') or 'index'


def route_id(route: str) -> str:
    return 'doc-' + route_slug(route).replace('/', '--')


def english_path_for_route(route: str) -> Path:
    slug = route_slug(route)
    if slug == 'index':
        return SOURCE / 'index.mdx'
    return SOURCE / (slug + '.mdx')


def extract_page(path: Path) -> tuple[str, str]:
    source = path.read_text(encoding='utf-8')
    match = re.match(r'\A---\r?\n(.*?)\r?\n---\r?\n', source, re.S)
    if match is None:
        raise ValueError(f'Missing frontmatter: {path}')
    title_match = re.search(r'^title:\s*(.+)$', match.group(1), re.M)
    if title_match is None:
        raise ValueError(f'Missing title: {path}')
    return title_match.group(1).strip().strip('"'), source[match.end():]


def render_markdown(content: str) -> str:
    result = subprocess.run(
        ['pandoc', '--from=markdown+raw_html+pipe_tables+fenced_code_blocks',
         '--to=html5', '--wrap=none'],
        input=content,
        capture_output=True,
        text=True,
        encoding='utf-8',
        check=True,
    )
    return result.stdout


# Brand marks taken from the published site (dark and light variants).
LOGO_DARK = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">'
    '<defs><linearGradient id="oc-logo-dl" gradientUnits="userSpaceOnUse" x1="-42" y1="-20" x2="-2" y2="12">'
    '<stop offset="0" stop-color="#f5f5f7" stop-opacity=".025"/><stop offset=".72" stop-color="#f5f5f7" stop-opacity=".143"/>'
    '<stop offset="1" stop-color="#f5f5f7" stop-opacity=".198"/></linearGradient>'
    '<linearGradient id="oc-logo-dr" gradientUnits="userSpaceOnUse" x1="40" y1="3" x2="3" y2="-16">'
    '<stop offset="0" stop-color="#f5f5f7" stop-opacity=".071"/><stop offset=".68" stop-color="#f5f5f7" stop-opacity=".174"/>'
    '<stop offset="1" stop-color="#f5f5f7" stop-opacity=".223"/></linearGradient></defs>'
    '<path d="M-41.568 -24 L-41.568 24 L0 0 Z" fill="url(#oc-logo-dl)"/>'
    '<path d="M41.568 -24 L0 0 L41.568 24 Z" fill="url(#oc-logo-dr)"/>'
    '<path d="M0 -48 L41.568 -24 L0 0 L-41.568 -24 Z" fill="#f5f5f7" fill-opacity=".08"/>'
    '<path d="M0 -43.2 L33.254 -24 L0 -4.8 L-33.254 -24 Z" fill="#f5f5f7" fill-opacity=".22"/>'
    '<path d="M0 -37.92 L24.109 -24 L0 -10.08 L-24.109 -24 Z" fill="#f5f5f7" fill-opacity=".27"/>'
    '<path d="M0 -32.64 L14.964 -24 L0 -15.36 L-14.964 -24 Z" fill="#f5f5f7" fill-opacity=".85"/>'
    '<g fill="none" stroke="#f5f5f7" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">'
    '<path d="M0 -48 L-41.568 -24 L0 0 L41.568 -24 Z"/><path d="M-41.568 -24 L-41.568 24 L0 48 L41.568 24 L41.568 -24"/>'
    '<path d="M0 0 L0 48"/></g></svg>'
)

LOGO_LIGHT = (
    LOGO_DARK.replace('#f5f5f7', '#100f0f')
    .replace('oc-logo-dl', 'oc-logo-ll')
    .replace('oc-logo-dr', 'oc-logo-lr')
)

ICON_SEARCH = (
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" '
    'stroke="currentColor" stroke-width="2"/><path d="m16.5 16.5 4 4" fill="none" stroke="currentColor" '
    'stroke-width="2" stroke-linecap="round"/></svg>'
)
ICON_MENU = (
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" fill="none" '
    'stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
)
ICON_CARET = (
    '<svg class="caret" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">'
    '<path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
    'stroke-linejoin="round"/></svg>'
)
ICON_GITHUB = (
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 '
    '3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 '
    '1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 '
    '.67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 '
    '3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>'
)

CSS = r"""
:root{
  color-scheme:dark;
  --sl-color-white:#ebe7dd;--sl-color-gray-1:#e2ded3;--sl-color-gray-2:#dbd7cc;--sl-color-gray-3:#949187;
  --sl-color-gray-4:#4a4744;--sl-color-gray-5:#221f1e;--sl-color-gray-6:#1b1918;--sl-color-black:#120f0e;
  --sl-color-accent-low:#2d1c12;--sl-color-accent:#da7c47;--sl-color-accent-high:#eb8c57;
  --sl-color-text:var(--sl-color-gray-2);--sl-color-text-accent:var(--sl-color-accent-high);
  --sl-color-text-invert:var(--sl-color-accent-low);--sl-color-bg:var(--sl-color-black);
  --sl-color-bg-nav:var(--sl-color-gray-6);--sl-color-bg-sidebar:var(--sl-color-gray-6);
  --sl-color-bg-inline-code:var(--sl-color-gray-5);--sl-color-bg-accent:var(--sl-color-accent-high);
  --sl-color-hairline-light:var(--sl-color-gray-5);--sl-color-hairline:var(--sl-color-gray-6);
  --sl-color-hairline-shade:var(--sl-color-black);--sl-color-backdrop-overlay:hsla(223,13%,10%,.66);
  --oc-tile:color-mix(in srgb,var(--sl-color-gray-2) 4%,transparent);
  --oc-tile-inset:color-mix(in srgb,var(--sl-color-gray-2) 6%,transparent);
  --oc-selection:#c8c6c52b;
  --oc-green:#76ad4f;--oc-info:#479fe6;--oc-warning:#c67f13;--oc-error:#da5b4a;
  --oc-radius:6px;--oc-radius-control:8px;--oc-radius-lg:12px;--oc-ease:cubic-bezier(.16,1,.3,1);
  --sl-nav-height:3.5rem;--sl-nav-pad-x:1rem;--sl-nav-pad-y:.75rem;
  --sl-sidebar-width:17rem;--sl-sidebar-pad-x:1rem;--sl-content-width:44rem;--sl-content-pad-x:1.5rem;
  --sl-mobile-toc-height:3rem;
  --sl-text-xs:.8125rem;--sl-text-sm:.875rem;--sl-text-base:1rem;--sl-text-lg:1.125rem;
  --sl-text-h1:2.625rem;--sl-text-h2:2.1875rem;--sl-text-h3:1.8125rem;--sl-text-h4:1.5rem;--sl-text-h5:1.125rem;
  --sl-text-body:.95rem;--sl-text-code:.875rem;--sl-text-code-sm:.8125rem;
  --sl-line-height:1.75;--sl-line-height-headings:1.2;
  --sl-font:"Fixel Text","Inter",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
  --sl-font-display:"Fixel Display","Fixel Text","Inter",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
  --sl-font-mono:"Cascadia Mono","SF Mono",ui-monospace,SFMono-Regular,Consolas,monospace;
}
:root[data-theme=light]{
  color-scheme:light;
  --sl-color-white:#2e2e29;--sl-color-gray-1:#393934;--sl-color-gray-2:#44443d;--sl-color-gray-3:#696960;
  --sl-color-gray-4:#b5b2ac;--sl-color-gray-5:#e5e1de;--sl-color-gray-6:#f3f2f0;--sl-color-gray-7:#f7f6f4;
  --sl-color-black:#fdfcfa;
  --sl-color-accent-low:#f3e9e3;--sl-color-accent:#b35017;--sl-color-accent-high:#9a4310;
  --sl-color-text-accent:var(--sl-color-accent);--sl-color-text-invert:#fdfcfa;
  --sl-color-bg:var(--sl-color-black);--sl-color-bg-nav:rgba(253,252,250,.94);
  --sl-color-bg-sidebar:var(--sl-color-gray-7);
  --sl-color-hairline-light:rgba(57,57,52,.06);--sl-color-hairline:rgba(57,57,52,.04);
  --sl-color-hairline-shade:rgba(57,57,52,.08);--sl-color-backdrop-overlay:rgba(57,57,52,.3);
  --oc-tile:color-mix(in srgb,var(--sl-color-gray-2) 5%,transparent);
  --oc-tile-inset:rgba(57,57,52,.06);--oc-selection:#a9998f2b;
  --oc-green:#517734;--oc-info:#2c6ebd;--oc-warning:#886914;--oc-error:#b7493f;
}
*,*::before,*::after{box-sizing:border-box}
html{scrollbar-gutter:stable}
html,body{margin:0;padding:0}
body{
  background:var(--sl-color-bg);color:var(--sl-color-text);
  font-family:var(--sl-font);font-size:var(--sl-text-body);line-height:var(--sl-line-height);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
::selection{background:var(--oc-selection)}
a{color:var(--sl-color-text-accent)}
img,svg{display:block}
button,input,select{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--sl-color-accent);outline-offset:2px;border-radius:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.skip-link{position:absolute;left:1rem;top:-4rem;z-index:30;padding:.5rem .75rem;background:var(--sl-color-bg-nav);
  border:1px solid var(--sl-color-hairline-light);border-radius:var(--oc-radius-control);text-decoration:none;
  color:var(--sl-color-white);transition:top .15s var(--oc-ease)}
.skip-link:focus{top:.5rem}
@supports selector(:has(a)){.skip-link:target{top:.5rem}}

/* header */
.header{
  position:fixed;inset-block-start:0;inset-inline:0;z-index:10;height:var(--sl-nav-height);
  display:flex;align-items:center;justify-content:space-between;gap:1rem;
  padding:var(--sl-nav-pad-y) var(--sl-nav-pad-x);
  background:var(--sl-color-bg-nav);border-bottom:1px solid var(--sl-color-hairline-shade);
}
@supports (backdrop-filter:blur(1px)){.header{backdrop-filter:blur(8px)}}
.header-left,.header-right{display:flex;align-items:center;gap:.75rem;min-width:0}
.header-left{flex:0 0 auto}
.header-right{flex:1 1 auto;justify-content:flex-end}
.menu-btn{display:none;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;
  border:0;border-radius:var(--oc-radius-control);background:none;color:var(--sl-color-gray-2);cursor:pointer}
.menu-btn:hover{background:var(--oc-tile);color:var(--sl-color-white)}
.menu-btn svg{width:1.15rem;height:1.15rem}
.site-title{display:flex;align-items:center;gap:.625rem;text-decoration:none;color:var(--sl-color-white);min-width:0}
.site-title .logo{width:1.5rem;height:1.5rem;flex:0 0 auto}
.site-title .logo svg{width:100%;height:100%}
.logo-light{display:none}
:root[data-theme=light] .logo-dark{display:none}
:root[data-theme=light] .logo-light{display:block}
.site-name{font-size:1.0625rem;font-weight:600;letter-spacing:-.01em;white-space:nowrap}
.search-trigger{display:flex;align-items:center;gap:.5rem;flex:1 1 12rem;min-width:0;max-width:22rem;
  padding:.375rem .5rem .375rem .625rem;border:0;border-radius:9px;
  background:color-mix(in srgb,var(--sl-color-gray-6) 50%,var(--sl-color-black));
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sl-color-gray-2) 8%,transparent),inset 0 1px 2px #00000014;
  color:var(--sl-color-gray-3);font-size:.8125rem;cursor:pointer;transition:box-shadow .15s var(--oc-ease),color .15s var(--oc-ease)}
:root[data-theme=light] .search-trigger{background:color-mix(in srgb,var(--sl-color-gray-6) 60%,var(--sl-color-black))}
.search-trigger:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--sl-color-gray-2) 20%,transparent),inset 0 1px 2px #00000014;color:var(--sl-color-white)}
.search-trigger svg{width:.95rem;height:.95rem;flex:0 0 auto}
.search-trigger .search-kbd{display:flex;margin-inline-start:auto;gap:.2rem}
kbd{display:inline-flex;align-items:center;justify-content:center;min-width:1.35rem;height:1.35rem;padding:0 .3rem;
  border:0;border-radius:5px;background:var(--oc-tile-inset);color:var(--sl-color-gray-3);
  font-family:var(--sl-font);font-size:.75rem}
.search-trigger .search-kbd kbd{background:none;min-width:0;height:auto;padding:0}
.lang-marker{font-size:.8125rem;color:var(--sl-color-gray-3);white-space:nowrap}
.theme-select{display:inline-flex;align-items:center}
.theme-select select{appearance:none;padding:.3rem 1.75rem .3rem .6rem;border:1px solid var(--sl-color-hairline-light);
  border-radius:var(--oc-radius-control);background:var(--oc-tile);color:var(--sl-color-gray-2);font-size:.8125rem;
  cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23949187' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right .55rem center}
.social-link{display:inline-flex;align-items:center;justify-content:center;width:1.75rem;height:1.75rem;
  border-radius:var(--oc-radius-control);color:var(--sl-color-gray-3);text-decoration:none}
.social-link:hover{color:var(--sl-color-white);background:var(--oc-tile)}
.social-link svg{width:1rem;height:1rem}

/* sidebar */
.sidebar{
  position:fixed;inset-block:var(--sl-nav-height) 0;inset-inline-start:0;z-index:5;
  width:var(--sl-sidebar-width);overflow-y:auto;overscroll-behavior:contain;
  background:var(--sl-color-bg-sidebar);border-inline-end:1px solid var(--sl-color-hairline-shade);
  padding:1rem var(--sl-sidebar-pad-x) 2rem;
}
.sidebar-meta{font-size:.75rem;color:var(--sl-color-gray-3);padding:.2em .5rem .9rem}
.nav-group{margin:0 0 .75rem}
.nav-group>summary{display:flex;align-items:center;justify-content:space-between;gap:.5rem;
  padding:.2em .5em;line-height:1.4;cursor:pointer;user-select:none;list-style:none;
  color:var(--sl-color-gray-3);font-size:var(--sl-text-xs);font-weight:600}
.nav-group>summary::-webkit-details-marker{display:none}
.nav-group>summary .caret{transition:transform .2s ease-in-out;flex-shrink:0}
.nav-group[open]>summary .caret{transform:rotate(90deg)}
.nav-group ul{list-style:none;margin:0;padding:0}
.nav-link{display:block;padding:.3em .5rem;border-radius:.25rem;line-height:1.4;font-size:var(--sl-text-sm);
  color:var(--sl-color-gray-2);text-decoration:none}
.nav-link:hover,.nav-link:focus{color:var(--sl-color-white)}
.nav-link[aria-current=page]{font-weight:600;color:var(--sl-color-text-invert);background-color:var(--sl-color-bg-accent)}
.sidebar-scrim{position:fixed;inset:0;z-index:4;background:var(--sl-color-backdrop-overlay);border:0;padding:0}
.sidebar-scrim[hidden]{display:none}

/* layout */
.main{display:grid;margin-inline-start:var(--sl-sidebar-width);padding-block-start:var(--sl-nav-height);
  grid-template-columns:minmax(0,1fr) minmax(0,var(--sl-content-width)) minmax(0,1fr)}
.content-column{grid-column:2;min-width:0}
.content-panel{padding:1.5rem var(--sl-content-pad-x) 0}
.content-panel article.document[hidden]{display:none}
.toc-column{grid-column:3;min-width:0;padding:1rem var(--sl-sidebar-pad-x)}
.toc-panel{position:sticky;top:calc(var(--sl-nav-height) + .5rem);max-height:calc(100vh - var(--sl-nav-height) - 2rem);overflow-y:auto}
.toc-panel h2{color:var(--sl-color-white);font-size:var(--sl-text-h5);font-weight:600;line-height:var(--sl-line-height-headings);margin:0 0 .5rem}
.toc-list{list-style:none;margin:0;padding:0}
.toc-list li{margin:0}
.toc-list a{display:block;font-size:.78rem;line-height:1.5;letter-spacing:.01em;padding:.18rem 0;
  color:var(--sl-color-gray-3);text-decoration:none;overflow-wrap:anywhere;transition:color .15s var(--oc-ease)}
.toc-list a:hover,.toc-list a[aria-current=true]{color:var(--sl-color-white)}
.toc-list .depth-3{padding-inline-start:.9rem}
.mobile-toc{display:none}

/* article typography */
.sl-markdown-content{overflow-wrap:break-word}
.sl-markdown-content :is(h1,h2,h3,h4,h5,h6){
  font-family:var(--sl-font-display);font-weight:600;letter-spacing:-.02em;color:var(--sl-color-white);
  line-height:var(--sl-line-height-headings);scroll-margin-top:calc(var(--sl-nav-height) + 1rem)}
.sl-markdown-content :is(h1,h2){letter-spacing:-.025em;line-height:1.1}
.sl-markdown-content h1{font-size:var(--sl-text-h1);margin:0 0 1rem}
.sl-markdown-content h2{font-size:var(--sl-text-h2);margin:2rem 0 .75rem}
.sl-markdown-content h3{font-size:var(--sl-text-h3);margin:1.75rem 0 .5rem}
.sl-markdown-content h4{font-size:var(--sl-text-h4);margin:1.5rem 0 .5rem}
.sl-markdown-content h5{font-size:var(--sl-text-h5);margin:1.25rem 0 .5rem}
.sl-markdown-content p,.sl-markdown-content li{font-size:var(--sl-text-body);line-height:var(--sl-line-height)}
.sl-markdown-content p{margin:0 0 1rem}
.sl-markdown-content :is(ul,ol){margin:0 0 1rem;padding-inline-start:1.4em}
.sl-markdown-content li{margin:.25rem 0}
.sl-markdown-content li>ul,.sl-markdown-content li>ol{margin:.25rem 0}
.sl-markdown-content a{color:var(--sl-color-text-accent);text-decoration:underline;
  text-decoration-color:color-mix(in srgb,var(--sl-color-accent) 40%,transparent);text-underline-offset:.15em;
  transition:color .15s var(--oc-ease),text-decoration-color .15s var(--oc-ease)}
.sl-markdown-content a:hover{color:var(--sl-color-white);text-decoration-color:var(--sl-color-accent)}
.sl-markdown-content strong{color:var(--sl-color-white);font-weight:600}
.sl-markdown-content hr{border:0;border-top:1px solid var(--sl-color-hairline-light);margin:2rem 0}
.sl-markdown-content code{background:var(--sl-color-bg-inline-code);border-radius:var(--oc-radius);
  padding:.125rem .375rem;font-family:var(--sl-font-mono);font-size:.85em;color:var(--sl-color-white)}
.code-block{position:relative;margin:0 0 1.25rem}
.sl-markdown-content pre{margin:0;padding:.75rem 1rem;overflow-x:auto;
  background:var(--sl-color-gray-6);border:1px solid var(--sl-color-gray-5);border-radius:var(--oc-radius-lg);
  font-size:var(--sl-text-code);line-height:1.6;tab-size:2}
.sl-markdown-content pre code{background:none;border:0;padding:0;font-size:inherit;color:var(--sl-color-white)}
:root[data-theme=light] .sl-markdown-content pre{background:#faf9f7;border-color:rgba(57,57,52,.08)}
.copy-btn{position:absolute;top:.4rem;right:.4rem;display:inline-flex;align-items:center;justify-content:center;
  height:1.65rem;padding:0 .5rem;border:1px solid var(--sl-color-hairline-light);border-radius:var(--oc-radius);
  background:color-mix(in srgb,var(--sl-color-gray-6) 80%,transparent);color:var(--sl-color-gray-3);
  font-size:.7rem;cursor:pointer;opacity:0;transition:opacity .15s var(--oc-ease),color .15s var(--oc-ease);z-index:1}
.code-block:hover .copy-btn,.code-block:focus-within .copy-btn,.copy-btn:focus-visible{opacity:1}
.copy-btn:hover{color:var(--sl-color-white)}
.sl-markdown-content table{display:block;width:100%;max-width:100%;overflow-x:auto;border-collapse:collapse;
  border-spacing:0;margin:0 0 1.25rem;font-size:.9rem}
.sl-markdown-content :is(th,td){border-bottom:1px solid var(--sl-color-hairline-shade);padding:.625rem .875rem;
  text-align:start;vertical-align:baseline}
.sl-markdown-content th{color:var(--sl-color-white);font-weight:600;white-space:nowrap}
.sl-markdown-content tr:last-child td{border-bottom:0}
.sl-markdown-content blockquote{margin:0 0 1.25rem;padding:.875rem 1.125rem;border:0;border-radius:var(--oc-radius-lg);
  background:var(--oc-tile);color:var(--sl-color-gray-2)}
.sl-markdown-content blockquote>:last-child{margin-bottom:0}
.sl-markdown-content details{margin:0 0 1.25rem;padding:.75rem 1rem;border:1px solid var(--sl-color-hairline-light);
  border-radius:var(--oc-radius-control)}
.sl-markdown-content details>summary{color:var(--sl-color-white);font-weight:500;cursor:pointer;margin-inline-start:-.5rem;padding-inline-start:.5rem}
.sl-markdown-content details[open]>summary{margin-bottom:.75rem}
.sl-markdown-content img{max-width:100%;height:auto;border-radius:var(--oc-radius-control)}
.sl-markdown-content .breadcrumbs{display:none}
.sl-markdown-content kbd{border:1px solid var(--sl-color-hairline-light);border-bottom-width:2px;background:var(--oc-tile-inset);
  padding:.05rem .35rem;font-family:var(--sl-font-mono);font-size:.8em;min-width:auto;height:auto}

/* footer */
.docs-footer{margin:2.25rem var(--sl-content-pad-x) 3rem;padding-top:1.5rem;border-top:1px solid var(--sl-color-hairline-shade);
  display:flex;align-items:flex-start;justify-content:space-between;gap:1rem 2rem;flex-wrap:wrap}
.docs-footer-links{display:grid;gap:.6rem}
.docs-footer a{display:inline-flex;align-items:center;gap:.6rem;text-decoration:none;color:var(--sl-color-gray-3);font-size:var(--sl-text-xs)}
.docs-footer a:hover{color:var(--sl-color-white)}
.docs-footer a svg{width:1rem;height:1rem;flex:0 0 auto;color:currentColor}
.docs-footer-meta{display:grid;gap:.6rem;justify-items:end;margin-left:auto;text-align:end}
.docs-footer-updated{margin:0;color:var(--sl-color-gray-3);font-size:var(--sl-text-xs)}
.docs-footer-note{margin:0;color:var(--sl-color-gray-3);font-size:.75rem}

/* search dialog */
.search-dialog{width:min(42rem,calc(100vw - 2rem));max-width:none;max-height:min(32rem,calc(100vh - 8rem));
  margin:6rem auto auto;padding:0;border:0;border-radius:var(--oc-radius-lg);
  background:var(--sl-color-bg);color:var(--sl-color-text);
  box-shadow:0 0 0 1px #0000004d,0 2px 6px -1px #0000004d,0 12px 28px -6px #00000073,0 32px 72px -12px #0009;
  overflow:hidden}
:root[data-theme=light] .search-dialog{box-shadow:0 0 0 1px rgba(57,57,52,.12),0 12px 28px -6px rgba(57,57,52,.18),0 32px 72px -12px rgba(57,57,52,.22)}
.search-dialog::backdrop{background:var(--sl-color-backdrop-overlay);backdrop-filter:blur(4px)}
.search-panel{display:flex;flex-direction:column;max-height:inherit}
.search-input-row{display:flex;align-items:center;gap:.6rem;padding:.85rem 1rem;border-bottom:1px solid var(--sl-color-hairline-shade)}
.search-input-row svg{width:1.05rem;height:1.05rem;flex:0 0 auto;color:var(--sl-color-gray-3)}
.search-input-row input{flex:1;min-width:0;border:0;background:none;color:var(--sl-color-white);font-size:var(--sl-text-body);outline:none}
.search-input-row input::-webkit-search-cancel-button{display:none}
.search-cancel{border:0;background:none;color:var(--sl-color-gray-3);font-size:var(--sl-text-xs);cursor:pointer}
.search-results{overflow-y:auto;padding:.5rem;outline:none}
.search-results:empty{display:none}
.search-group+.search-group{margin-top:.75rem}
.search-group-label{display:flex;align-items:center;justify-content:space-between;margin:0 0 .35rem;padding-inline:.5rem;
  font-size:.75rem;font-weight:500;color:var(--sl-color-gray-3)}
.search-result{display:block;width:100%;text-align:start;padding:.5rem .6rem;border:0;border-radius:var(--oc-radius-control);
  background:none;cursor:pointer;color:var(--sl-color-gray-2)}
.search-result:hover,.search-result.is-active{background:var(--oc-tile);color:var(--sl-color-white)}
.search-result-title{display:block;font-size:var(--sl-text-sm);font-weight:500}
.search-result-snippet{display:block;margin-top:.15rem;font-size:.78rem;line-height:1.5;color:var(--sl-color-gray-3);
  overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.search-result mark{background:none;color:var(--sl-color-accent-high);font-weight:600}
:root[data-theme=light] .search-result mark{color:var(--sl-color-accent)}
.search-empty{margin:0;padding:1.5rem .75rem;text-align:center;color:var(--sl-color-gray-3);font-size:.85rem}
.search-legend{display:flex;gap:1rem;padding:.5rem 1rem;border-top:1px solid var(--sl-color-hairline-shade);
  color:var(--sl-color-gray-3);font-size:.75rem}
.search-legend span{display:inline-flex;align-items:center;gap:.35rem}
.search-legend kbd{background:none;height:auto;min-width:0}

/* responsive */
@media (min-width:50em){.menu-btn{display:none}.search-trigger .search-label{display:inline}}
@media (max-width:71.99em){
  .main{grid-template-columns:minmax(0,1fr)}
  .content-column{grid-column:1;width:100%;max-width:var(--sl-content-width);margin-inline:auto}
  .toc-column{display:none}
  .mobile-toc{display:block;position:sticky;top:var(--sl-nav-height);z-index:4;
    background:var(--sl-color-bg);border-bottom:1px solid var(--sl-color-hairline-shade)}
  .mobile-toc>summary{display:flex;align-items:center;gap:.5rem;height:var(--sl-mobile-toc-height);
    padding:.5rem 1rem;font-size:var(--sl-text-xs);cursor:pointer;list-style:none;color:var(--sl-color-gray-2)}
  .mobile-toc>summary::-webkit-details-marker{display:none}
  .mobile-toc .display-current{color:var(--sl-color-gray-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .mobile-toc .toc-list{padding:0 1rem 1rem}
  .mobile-toc[open]>summary .caret{transform:rotate(90deg)}
}
@media (max-width:49.99em){
  .sidebar{transform:translateX(-100%);transition:transform .22s var(--oc-ease);width:min(20rem,86vw);
    box-shadow:0 0 0 1px var(--sl-color-hairline-shade),0 12px 32px #0006}
  body.sidebar-open .sidebar{transform:none}
  .main{margin-inline-start:0}
  .menu-btn{display:inline-flex}
  .search-trigger{max-width:none;background:transparent;box-shadow:none;padding:.375rem;border-radius:var(--oc-radius-control)}
  .search-trigger .search-label,.search-trigger .search-kbd{display:none}
  .social-link{display:none}
  .site-name{font-size:1rem}
  .lang-marker{display:none}
  .content-panel{padding-top:1rem}
  .docs-footer{margin-inline:1rem;justify-items:start}
  .docs-footer-meta{justify-items:start;margin-left:0;text-align:start}
  .search-dialog{width:100vw;max-width:100vw;max-height:100vh;height:100dvh;margin:0;border-radius:0}
}
@media (prefers-reduced-motion:reduce){
  *{transition-duration:.01ms!important;animation-duration:.01ms!important}
}
@media print{
  .header,.sidebar,.toc-column,.mobile-toc,.sidebar-scrim,.docs-footer-links,.copy-btn,.skip-link{display:none!important}
  .main{margin:0;padding:0;display:block}
  .content-column{max-width:none;margin:0}
  .content-panel{padding:0}
  body{background:#fff;color:#111;font-size:11pt}
  .sl-markdown-content :is(h1,h2,h3,h4,h5,h6),.sl-markdown-content strong,.sl-markdown-content code{color:#111}
  .sl-markdown-content a{color:#11569b;text-decoration:underline}
  .sl-markdown-content pre{white-space:pre-wrap;background:#f4f4f4;border-color:#ccc;color:#111}
  .sl-markdown-content pre code{color:#111}
  .sl-markdown-content table{display:table;overflow:visible}
  .sl-markdown-content :is(th,td){border-bottom-color:#ccc}
  .docs-footer{border-top-color:#ccc}
}
"""

JS = r"""
(function(){
  'use strict';
  var SECTIONS = __SECTIONS__;
  var pageEls = Array.prototype.slice.call(document.querySelectorAll('article.document'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var byId = new Map(pageEls.map(function(p){ return [p.id, p]; }));
  var html = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme ---------- */
  var themeSelect = document.getElementById('theme');
  var mql = window.matchMedia('(prefers-color-scheme: light)');
  function readTheme(){
    try { return localStorage.getItem('ocru-theme') || 'auto'; } catch (e) { return 'auto'; }
  }
  function applyTheme(value){
    var mode = value === 'light' || value === 'dark' ? value : 'auto';
    html.dataset.theme = mode === 'auto' ? (mql.matches ? 'light' : 'dark') : mode;
    if (themeSelect) themeSelect.value = mode;
  }
  applyTheme(readTheme());
  if (themeSelect) {
    themeSelect.addEventListener('change', function(){
      var value = themeSelect.value;
      applyTheme(value);
      try { localStorage.setItem('ocru-theme', value); } catch (e) {}
    });
  }
  var onScheme = function(){ if (themeSelect && themeSelect.value === 'auto') applyTheme('auto'); };
  if (mql.addEventListener) mql.addEventListener('change', onScheme); else if (mql.addListener) mql.addListener(onScheme);

  /* ---------- routing ---------- */
  var pageIdFromTarget = function(target){
    var id = target;
    while (id) {
      if (byId.has(id)) return { page: byId.get(id), anchor: id === target ? null : id };
      var cut = id.lastIndexOf('--');
      if (cut < 0) break;
      id = id.slice(0, cut);
    }
    return null;
  };

  var currentId = null;
  var tocItems = [];

  function buildToc(page){
    var list = document.getElementById('toc-list');
    var mobileList = document.getElementById('mobile-toc-list');
    var mobileCurrent = document.getElementById('mobile-toc-current');
    tocItems = [];
    if (!list) return;
    var heads = Array.prototype.slice.call(page.querySelectorAll('h2,h3'));
    var items = [{ id: page.id, text: 'Обзор', depth: 2 }].concat(heads.map(function(h){
      return { id: h.id, text: h.textContent.trim(), depth: Number(h.tagName.charAt(1)) };
    }));
    var makeList = function(){
      var ul = document.createElement('ul');
      ul.className = 'toc-list';
      items.forEach(function(item){
        var li = document.createElement('li');
        li.className = 'depth-' + item.depth;
        var a = document.createElement('a');
        a.href = '#' + item.id;
        a.textContent = item.text;
        a.dataset.target = item.id;
        li.appendChild(a);
        ul.appendChild(li);
      });
      return ul;
    };
    list.replaceChildren(makeList());
    if (mobileList) mobileList.replaceChildren(makeList());
    if (mobileCurrent) mobileCurrent.textContent = '';
    tocItems = Array.prototype.slice.call(list.querySelectorAll('a'));
  }

  function setActiveToc(id){
    tocItems.forEach(function(a){ a.setAttribute('aria-current', a.dataset.target === id ? 'true' : 'false'); });
    var mobileCurrent = document.getElementById('mobile-toc-current');
    if (mobileCurrent) {
      var match = tocItems.filter(function(a){ return a.dataset.target === id; })[0];
      mobileCurrent.textContent = match ? '· ' + match.textContent : '';
    }
  }

  function showPage(page, anchor, push){
    if (!page) page = byId.get('doc-index');
    if (!page) return;
    pageEls.forEach(function(p){ p.hidden = p !== page; });
    navLinks.forEach(function(a){
      if (a.dataset.route === page.dataset.route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = page.dataset.title + ' — OpenChamber';
    currentId = page.id;
    buildToc(page);
    var target = anchor && document.getElementById(anchor) ? anchor : page.id;
    if (push) {
      var hash = '#' + target;
      if (location.hash !== hash) history.pushState(null, '', hash);
    }
    var el = document.getElementById(target);
    if (target !== page.id && el) {
      var top = el.getBoundingClientRect().top + window.pageYOffset - (document.getElementById('header').offsetHeight + 16);
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
      setActiveToc(target);
    } else {
      window.scrollTo(0, 0);
      setActiveToc(page.id);
    }
    if (window.innerWidth < 800) closeSidebar();
  }

  function route(hash, push){
    var raw = (hash || '').replace(/^#/, '');
    var decoded = raw;
    try { decoded = decodeURIComponent(raw); } catch (e) {}
    var found = decoded ? pageIdFromTarget(decoded) : null;
    if (found) { showPage(found.page, found.anchor, push === true); return; }
    var initial = byId.get('doc-index');
    showPage(initial, null, false);
  }

  document.addEventListener('click', function(event){
    var link = event.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;
    var target = href.slice(1);
    var found = pageIdFromTarget(target);
    if (!found) return;
    event.preventDefault();
    if (found.page.id === currentId && !found.anchor) {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      setActiveToc(found.page.id);
      return;
    }
    showPage(found.page, found.anchor, true);
  });

  window.addEventListener('popstate', function(){
    route(location.hash, false);
  });
  window.addEventListener('hashchange', function(){
    var target = location.hash.slice(1);
    var found = target ? pageIdFromTarget(target) : null;
    if (!found) return;
    if (found.page.id === currentId) {
      setActiveToc(found.anchor || found.page.id);
      return;
    }
    showPage(found.page, found.anchor, false);
  });

  /* ---------- scroll spy ---------- */
  var spyTick = false;
  window.addEventListener('scroll', function(){
    if (spyTick) return;
    spyTick = true;
    window.requestAnimationFrame(function(){
      spyTick = false;
      var page = byId.get(currentId);
      if (!page) return;
      var offset = document.getElementById('header').offsetHeight + 24;
      var active = page.id;
      var heads = page.querySelectorAll('h2,h3');
      for (var i = 0; i < heads.length; i += 1) {
        if (heads[i].getBoundingClientRect().top - offset <= 0) active = heads[i].id;
      }
      setActiveToc(active);
    });
  }, { passive: true });

  /* ---------- sidebar ---------- */
  var menuButton = document.getElementById('menu');
  var scrim = document.getElementById('scrim');
  function openSidebar(){
    document.body.classList.add('sidebar-open');
    if (menuButton) menuButton.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
  }
  function closeSidebar(){
    document.body.classList.remove('sidebar-open');
    if (menuButton) menuButton.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
  }
  if (menuButton) menuButton.addEventListener('click', function(){
    if (document.body.classList.contains('sidebar-open')) closeSidebar(); else openSidebar();
  });
  if (scrim) scrim.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  });

  /* ---------- copy code ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.sl-markdown-content pre')).forEach(function(pre){
    var wrap = document.createElement('div');
    wrap.className = 'code-block';
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-btn';
    button.textContent = 'Копировать';
    button.setAttribute('aria-label', 'Скопировать код');
    button.addEventListener('click', function(){
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      var done = function(ok){
        button.textContent = ok ? 'Скопировано' : 'Не удалось';
        window.setTimeout(function(){ button.textContent = 'Копировать'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
      } else {
        try {
          var area = document.createElement('textarea');
          area.value = text;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(area);
          done(ok);
        } catch (e) { done(false); }
      }
    });
    wrap.appendChild(button);
  });

  /* ---------- search ---------- */
  var index = pageEls.map(function(page){
    return {
      id: page.id,
      title: page.dataset.title || '',
      route: page.dataset.route || '',
      section: SECTIONS[page.dataset.route] || '',
      text: (page.textContent || '').replace(/\s+/g, ' ').trim(),
      heads: Array.prototype.slice.call(page.querySelectorAll('h2,h3')).map(function(h){
        return { id: h.id, text: h.textContent.trim() };
      })
    };
  });
  var dialog = document.getElementById('search-dialog');
  var input = document.getElementById('search-input');
  var resultsBox = document.getElementById('search-results');
  var openers = Array.prototype.slice.call(document.querySelectorAll('[data-search-open]'));
  var activeIndex = 0;
  var resultNodes = [];

  function snippetFor(entry, term){
    var text = entry.text;
    var pos = text.toLocaleLowerCase('ru').indexOf(term);
    if (pos < 0) pos = 0;
    var start = Math.max(0, pos - 60);
    var raw = text.slice(start, start + 180);
    var escaped = raw.replace(/[&<>"]/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
    var safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (start > 0 ? '…' : '') + escaped.replace(new RegExp(safeTerm, 'gi'), function(m){ return '<mark>' + m + '</mark>'; }) + '…';
  }

  function runSearch(){
    var query = input.value.trim();
    resultsBox.replaceChildren();
    resultNodes = [];
    if (!query) return;
    var terms = query.toLocaleLowerCase('ru').split(/\s+/).filter(Boolean);
    var scored = [];
    index.forEach(function(entry){
      var title = entry.title.toLocaleLowerCase('ru');
      var heads = entry.heads.map(function(h){ return h.text.toLocaleLowerCase('ru'); }).join(' ');
      var text = entry.text.toLocaleLowerCase('ru');
      var ok = terms.every(function(term){ return text.indexOf(term) >= 0; });
      if (!ok) return;
      var score = 0;
      terms.forEach(function(term){
        if (title.indexOf(term) >= 0) score += 6;
        if (heads.indexOf(term) >= 0) score += 3;
      });
      scored.push({ entry: entry, score: score, term: terms[0] });
    });
    scored.sort(function(a, b){
      if (b.score !== a.score) return b.score - a.score;
      return a.entry.title.localeCompare(b.entry.title, 'ru');
    });
    var top = scored.slice(0, 24);
    if (!top.length) {
      var empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = 'Ничего не найдено. Попробуйте другое слово.';
      resultsBox.appendChild(empty);
      return;
    }
    var groups = new Map();
    top.forEach(function(hit){
      var key = hit.entry.section || 'Прочее';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(hit);
    });
    groups.forEach(function(hits, section){
      var group = document.createElement('div');
      group.className = 'search-group';
      var label = document.createElement('p');
      label.className = 'search-group-label';
      label.textContent = section;
      group.appendChild(label);
      hits.forEach(function(hit){
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'search-result';
        button.dataset.target = hit.entry.id;
        var title = document.createElement('span');
        title.className = 'search-result-title';
        title.textContent = hit.entry.title;
        var snippet = document.createElement('span');
        snippet.className = 'search-result-snippet';
        snippet.innerHTML = snippetFor(hit.entry, hit.term);
        button.appendChild(title);
        button.appendChild(snippet);
        group.appendChild(button);
      });
      resultsBox.appendChild(group);
    });
    resultNodes = Array.prototype.slice.call(resultsBox.querySelectorAll('.search-result'));
    if (resultNodes.length) setActive(0);
  }

  function setActive(index){
    activeIndex = index;
    resultNodes.forEach(function(node, i){ node.classList.toggle('is-active', i === index); });
    var node = resultNodes[index];
    if (node) {
      var box = resultsBox.getBoundingClientRect();
      var rect = node.getBoundingClientRect();
      if (rect.top < box.top) resultsBox.scrollTop -= (box.top - rect.top) + 8;
      else if (rect.bottom > box.bottom) resultsBox.scrollTop += (rect.bottom - box.bottom) + 8;
    }
  }

  function openSearch(){
    if (!dialog) return;
    if (dialog.open) { if (input) input.focus(); return; }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (input) { input.focus(); input.select(); }
    runSearch();
  }
  function closeSearch(){
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  openers.forEach(function(node){ node.addEventListener('click', openSearch); });
  if (input) input.addEventListener('input', runSearch);
  if (dialog) {
    dialog.addEventListener('click', function(event){ if (event.target === dialog) closeSearch(); });
    dialog.addEventListener('cancel', function(event){ event.preventDefault(); closeSearch(); });
  }
  var closers = Array.prototype.slice.call(document.querySelectorAll('[data-search-close]'));
  closers.forEach(function(node){ node.addEventListener('click', closeSearch); });
  if (resultsBox) {
    resultsBox.addEventListener('click', function(event){
      var node = event.target.closest('.search-result');
      if (!node) return;
      var found = pageIdFromTarget(node.dataset.target);
      closeSearch();
      if (found) showPage(found.page, null, true);
    });
  }
  document.addEventListener('keydown', function(event){
    var meta = event.ctrlKey || event.metaKey;
    if (meta && (event.key === 'k' || event.key === 'K')) { event.preventDefault(); openSearch(); return; }
    if (!dialog || !dialog.open) return;
    if (event.key === 'ArrowDown' && resultNodes.length) { event.preventDefault(); setActive((activeIndex + 1) % resultNodes.length); }
    else if (event.key === 'ArrowUp' && resultNodes.length) { event.preventDefault(); setActive((activeIndex - 1 + resultNodes.length) % resultNodes.length); }
    else if (event.key === 'Enter') {
      var node = resultNodes[activeIndex];
      if (!node) return;
      event.preventDefault();
      var found = pageIdFromTarget(node.dataset.target);
      closeSearch();
      if (found) showPage(found.page, null, true);
    }
  });

  /* ---------- start ---------- */
  route(location.hash, false);
  if (!location.hash) history.replaceState(null, '', '#' + (byId.get('doc-index') ? 'doc-index' : pageEls[0].id));
})();
"""


def build_nav(sections: list[dict], route_titles: dict[str, str]) -> tuple[str, dict[str, str]]:
    parts = ['<div class="sidebar-meta">Локальная версия · 62 страницы</div>', '<nav aria-label="Документация">']
    section_of: dict[str, str] = {}
    for section in sections:
        label = section.get('translations', {}).get('ru', section['label'])
        parts.append('<details class="nav-group" open>')
        parts.append(f'<summary><span class="group-label">{html.escape(label)}</span>{ICON_CARET}</summary>')
        parts.append('<ul>')
        for item in section['items']:
            if 'link' not in item:
                continue
            route = item['link']
            section_of[route] = label
            parts.append(
                f'<li><a class="nav-link" href="#{route_id(route)}" data-route="{html.escape(route, quote=True)}">'
                f'{html.escape(route_titles[route])}</a></li>'
            )
        parts.append('</ul></details>')
    parts.append('</nav>')
    return '\n'.join(parts), section_of


def main() -> None:
    menu = json.loads((HERE / 'sidebar.config.json').read_text(encoding='utf-8'))
    sections = menu['sections']
    ordered = []
    for section in sections:
        for item in section['items']:
            if 'link' in item:
                ordered.append(item)
    if len(ordered) != TOTAL_PAGES or len({i['link'] for i in ordered}) != TOTAL_PAGES:
        raise ValueError(f'Expected {TOTAL_PAGES} distinct documentation routes')

    route_titles = {
        item['link']: item.get('translations', {}).get('ru', item['label']) for item in ordered
    }
    nav_html, section_of = build_nav(sections, route_titles)

    articles = []
    for item in ordered:
        route = item['link']
        path = english_path_for_route(route)
        if not path.is_file():
            raise FileNotFoundError(path)
        title, content = extract_page(path)
        rendered = render_markdown(content)

        def localize_link(match: re.Match) -> str:
            href = html.unescape(match.group(2))
            if not href.startswith('/') or href.startswith('//'):
                return match.group(0)
            route_part, marker, fragment = href.partition('#')
            target_route = '/' + route_part.strip('/') + '/' if route_part.strip('/') else '/'
            if target_route not in {i['link'] for i in ordered}:
                return match.group(0)
            target_id = route_id(target_route)
            if marker and fragment:
                # In-page fragment destinations are generated by Pandoc, scoped to article.
                target_id += '--' + fragment
            return match.group(1) + '#' + target_id + match.group(3)

        rendered = re.sub(r'(<a\s+[^>]*?href=")([^"]+)(")', localize_link, rendered)
        # Scope all Pandoc-generated ids (headings and code blocks) to the article.
        def scope_anchor(match: re.Match) -> str:
            prefix, anchor, suffix = match.groups()
            return prefix + route_id(route) + '--' + anchor + suffix
        rendered = re.sub(r'(\bid=")([^"]+)(")', scope_anchor, rendered)
        # Original links contain English heading fragments; translated headings
        # receive different Pandoc slugs. Add aliases matching original anchors.
        english = SOURCE.parent / path.relative_to(SOURCE)
        _, english_body = extract_page(english)
        english_html = render_markdown(english_body)
        english_heads = re.findall(r'<h[1-6]\s+id="([^"]+)"', english_html)
        russian_heads = re.findall(r'<h[1-6]\s+id="([^"]+)"', rendered)
        if len(english_heads) != len(russian_heads):
            # A translation can lead the English source when a new section was
            # translated before the English page arrived here. Pairing headings by
            # position would then map English anchors to the wrong headings, so the
            # page keeps its own ids and no English anchor aliases are added.
            print(f'warning: heading count differs, English anchors are not aliased: '
                  f'{path.name} (en={len(english_heads)}, ru={len(russian_heads)})',
                  file=sys.stderr)
            aliases = {}
        else:
            aliases = {ru: en for en, ru in zip(english_heads, russian_heads)
                       if ru != route_id(route) + '--' + en}

        def add_alias(match: re.Match) -> str:
            start, current = match.groups()
            original = aliases.get(current)
            if original is None:
                return match.group(0)
            return f'<span id="{route_id(route)}--{html.escape(original, quote=True)}"></span>' + match.group(0)
        rendered = re.sub(r'(<h[1-6]\s+id="([^"]+)")', add_alias, rendered)
        # Links to same-document fragments need the same scope.
        rendered = re.sub(r'href="#(?!doc-)([^"]+)"',
                          lambda m: 'href="#' + route_id(route) + '--' + m.group(1) + '"', rendered)
        articles.append(
            f'<article class="document sl-markdown-content" id="{route_id(route)}"'
            f' data-title="{html.escape(title, quote=True)}" data-route="{html.escape(route, quote=True)}" hidden>'
            f'{rendered}</article>'
        )

    built_on = date.today().strftime('%d.%m.%Y')
    document = f'''<!doctype html>
<html lang="ru" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>OpenChamber — документация на русском</title>
<script>
try {{
  var saved = localStorage.getItem('ocru-theme') || 'auto';
  var light = window.matchMedia('(prefers-color-scheme: light)').matches;
  document.documentElement.dataset.theme = saved === 'light' || saved === 'dark' ? saved : (light ? 'light' : 'dark');
}} catch (e) {{}}
</script>
<style>{CSS}</style>
</head>
<body>
<a class="skip-link" href="#content-panel">Перейти к содержимому</a>
<header class="header" id="header">
  <div class="header-left">
    <button class="menu-btn" id="menu" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="sidebar">{ICON_MENU}</button>
    <a class="site-title" href="#doc-index" aria-label="OpenChamber — документация">
      <span class="logo logo-dark">{LOGO_DARK}</span>
      <span class="logo logo-light">{LOGO_LIGHT}</span>
      <span class="site-name">OpenChamber</span>
    </a>
  </div>
  <div class="header-right">
    <button class="search-trigger" type="button" data-search-open aria-label="Поиск по документации" aria-keyshortcuts="Control+K">
      {ICON_SEARCH}<span class="search-label">Поиск</span>
      <span class="search-kbd"><kbd>Ctrl</kbd><kbd>K</kbd></span>
    </button>
    <span class="lang-marker" title="Локальная русская версия">Русский</span>
    <a class="social-link" href="https://github.com/openchamber/openchamber" target="_blank" rel="noopener noreferrer" aria-label="OpenChamber на GitHub">{ICON_GITHUB}</a>
    <label class="theme-select"><span class="sr-only">Тема</span>
      <select id="theme" autocomplete="off">
        <option value="dark">Тёмная</option>
        <option value="light">Светлая</option>
        <option value="auto">Авто</option>
      </select>
    </label>
  </div>
</header>
<aside class="sidebar" id="sidebar">
{nav_html}
</aside>
<button class="sidebar-scrim" id="scrim" type="button" aria-label="Закрыть меню" hidden></button>
<main class="main">
  <div class="content-column">
    <details class="mobile-toc" id="mobile-toc">
      <summary>На этой странице <span class="display-current" id="mobile-toc-current"></span>{ICON_CARET}</summary>
      <div id="mobile-toc-list"></div>
    </details>
    <div class="content-panel" id="content-panel">
{chr(10).join(articles)}
    </div>
    <footer class="docs-footer">
      <div class="docs-footer-links">
        <a href="https://github.com/openchamber/openchamber/issues/new/choose" target="_blank" rel="noopener noreferrer">Нашли ошибку? Открыть issue</a>
        <a href="https://discord.gg/ZYRSdnwwKA" target="_blank" rel="noopener noreferrer">Сообщество в Discord</a>
      </div>
      <div class="docs-footer-meta">
        <p class="docs-footer-updated">Собрано {built_on} · перевод на русский</p>
        <p class="docs-footer-note">Внешние ссылки открываются только при наличии интернета.</p>
      </div>
    </footer>
  </div>
  <div class="toc-column">
    <div class="toc-panel">
      <nav aria-labelledby="toc-title">
        <h2 id="toc-title">На этой странице</h2>
        <div id="toc-list"></div>
      </nav>
    </div>
  </div>
</main>
<dialog class="search-dialog" id="search-dialog" aria-label="Поиск по документации">
  <div class="search-panel">
    <div class="search-input-row">
      {ICON_SEARCH}
      <input id="search-input" type="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" placeholder="Поиск по документации" aria-label="Поиск">
      <button class="search-cancel" type="button" data-search-close>Закрыть</button>
    </div>
    <div class="search-results" id="search-results" tabindex="-1"></div>
    <div class="search-legend">
      <span><kbd>↑</kbd><kbd>↓</kbd>Навигация</span>
      <span><kbd>↵</kbd>Открыть</span>
      <span><kbd>esc</kbd>Закрыть</span>
    </div>
  </div>
</dialog>
<script>{JS.replace('__SECTIONS__', json.dumps(section_of, ensure_ascii=False))}</script>
</body>
</html>
'''
    OUTPUT.write_text(document, encoding='utf-8')
    print(f'Created: {OUTPUT}')
    print(f'Pages: {len(articles)}, bytes: {OUTPUT.stat().st_size:,}')


if __name__ == '__main__':
    main()
