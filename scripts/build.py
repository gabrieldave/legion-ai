#!/usr/bin/env python3
"""Genera public/ (versiones es + en) a partir del HTML original de Legion AI.

Uso:
    python3 scripts/build.py [ruta/al/Legion_AI_Premium_Page.html]

Sin argumento usa la copia versionada en source/Legion_AI_Premium_Page.html.
El original está en inglés; la versión en español sale de i18n/es.py. Si algún texto
del diccionario ya no existe en el original, el build falla y lista qué pares revisar.
"""
import base64
import hashlib
import importlib.util
import re
import shutil
import sys
from html import escape
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "Legion_AI_Premium_Page.html"
PUBLIC = ROOT / "public"
SITE_URL = "https://legionai.iareal.net"
THEME = "#04070F"
WHATSAPP_BTN = '<a class="btn btn-p" href="https://wa.me/51960685684" style="min-height:44px;padding:0 20px;font-size:15px">'

IMAGE_NAMES = [
    "poster-gold-bitcoin",
    "poster-trade-smarter",
    "report-performance",
    "report-curve",
    "panel-spanish",
]

META_EN = {
    "og_title": "Legion AI | The smart market panel for MetaTrader 4",
    "og_description": (
        "One panel reads every timeframe of Gold, Bitcoin, indices and forex and tells you "
        "whether to wait, look for buys or look for sells."
    ),
    "og_locale": "en_US",
    "og_locale_alt": "es_MX",
}

LANG_CSS = """
.nav-end{display:flex;align-items:center;gap:12px;flex:none}
.lang-sw{display:flex;gap:2px;padding:3px;border:1px solid var(--line2);border-radius:12px;background:rgba(12,22,48,.6)}
.lang-sw button{min-width:44px;min-height:38px;border:0;border-radius:9px;background:transparent;color:var(--mist);font:600 13px/1 var(--mono);letter-spacing:.06em;cursor:pointer}
.lang-sw button:hover{color:#fff}
.lang-sw button[aria-pressed="true"]{background:var(--mint);color:var(--abyss)}
@media (max-width:440px){.nav-end .btn{display:none}}
"""

SCANNER_CSS = """
.scn{border-bottom:1px solid var(--line)}
.scn-tabs{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:-24px 0 40px;padding:2px}
.scn-tabs::-webkit-scrollbar{display:none}
.scn-tabs button{flex:none;min-height:44px;padding:0 18px;border:1px solid var(--line2);border-radius:12px;background:rgba(12,22,48,.6);color:var(--mist);font:600 13px/1 var(--mono);letter-spacing:.06em;cursor:pointer}
.scn-tabs button:hover{color:#fff}
.scn-tabs button[aria-selected="true"]{border-color:var(--mint);color:var(--mint);background:rgba(69,226,163,.08)}
[data-scanner]:not(.js) .scn-tabs{display:none}
.scn-pane{display:grid;grid-template-columns:minmax(0,480px) minmax(0,1fr);gap:56px;align-items:start}
.scn-pane.wide{grid-template-columns:minmax(0,7fr) minmax(0,4fr)}
.scn-pane[hidden]{display:none}
[data-scanner]:not(.js) .scn-pane+.scn-pane{margin-top:96px}
.scn-shot{display:block;border-radius:14px;overflow:hidden;border:1px solid var(--line2);background:#0B0F17;box-shadow:0 40px 90px -30px rgba(0,0,0,.85),0 0 60px -24px rgba(69,226,163,.3)}
.scn-shot img{display:block;width:100%;height:auto}
.scn-copy h3{font-size:clamp(26px,2.6vw,34px)}
.scn-copy .what{margin:16px 0 0;font-size:19px;color:var(--mist)}
.scn-copy h4{margin:30px 0 6px;font:600 12px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mint)}
.scn-how{list-style:none;margin:0;padding:0}
.scn-how li{padding:13px 0;border-top:1px solid rgba(39,57,94,.6);color:var(--mist);font-size:16px;line-height:1.55}
.scn-how b{display:block;color:var(--text);font-weight:600;margin-bottom:2px}
.scn-keys{margin-top:16px;font:500 13px/1.5 var(--mono);color:var(--dim)}
.scn-fig{grid-column:1/-1;margin:8px 0 0}
.scn-fig figcaption{margin-top:14px}
.scn-hint{margin-top:40px}
@media (max-width:960px){
  .scn-pane,.scn-pane.wide{grid-template-columns:minmax(0,1fr);gap:32px}
  .scn-pane:not(.wide)>.scn-shot{max-width:480px}
}
"""

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6DF0BB"/><stop offset="1" stop-color="#1D9E70"/></linearGradient></defs><rect width="34" height="34" rx="7" fill="#04070F"/><path d="M17 2 31 10v14L17 32 3 24V10Z" fill="none" stroke="url(#lg)" stroke-width="2"/><path d="M10 21l5-6 4 3 5-7" fill="none" stroke="#45E2A3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
"""

def load_module(name: str):
    spec = importlib.util.spec_from_file_location(f"i18n_{name}", ROOT / "i18n" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


SCANNER = load_module("scanner")
SCANNER_SRC = ROOT / "source" / "scanner"


def scanner_img(name: str, alt: str, eager: bool = False) -> str:
    version = hashlib.sha256((SCANNER_SRC / name).read_bytes()).hexdigest()[:10]
    w, h = SCANNER.SIZES[name]
    src = f"/img/scanner/{name}?v={version}"
    loading = "" if eager else ' loading="lazy"'
    return (
        f'<a class="scn-shot" href="{src}" target="_blank" rel="noopener">'
        f'<img src="{src}" alt="{escape(alt)}" width="{w}" height="{h}"{loading} decoding="async"></a>'
    )


def scanner_section(locale: str) -> str:
    c = SCANNER.ES if locale == "es" else SCANNER.EN
    tabs, panes = [], []
    for i, t in enumerate(c["tabs"]):
        tabs.append(
            f'<button type="button" role="tab" id="scn-t{i}" aria-controls="scn-p{i}" '
            f'aria-selected="{"true" if i == 0 else "false"}">{escape(t["label"])}</button>'
        )
        shots = "".join(scanner_img(f, alt) for f, alt in t["shots"])
        how = "".join(f"<li><b>{escape(b)}</b>{escape(txt)}</li>" for b, txt in t["how"])
        keys = f'<p class="scn-keys">{escape(t["keys"])}</p>' if t.get("keys") else ""
        fig = ""
        if t.get("figure"):
            f, alt, cap = t["figure"]
            fig = f'<figure class="scn-fig">{scanner_img(f, alt)}<figcaption class="small">{escape(cap)}</figcaption></figure>'
        cls = "scn-pane wide" if t.get("wide") else "scn-pane"
        panes.append(
            f'<div class="{cls}" role="tabpanel" id="scn-p{i}" aria-labelledby="scn-t{i}" tabindex="0">'
            f"{shots}"
            f'<div class="scn-copy"><h3>{escape(t["title"])}</h3><p class="what">{escape(t["what"])}</p>'
            f'<h4>{escape(c["how"])}</h4><ul class="scn-how">{how}</ul>{keys}</div>'
            f"{fig}</div>"
        )
    return f"""<!-- SCANNER -->
<section class="s scn" id="scanner" aria-labelledby="scn-h">
  <div class="wrap" data-scanner>
    <div class="head">
      <h2 id="scn-h">{escape(c["title"])}</h2>
      <p class="lead">{escape(c["lead"])}</p>
    </div>
    <div class="scn-tabs" role="tablist" aria-label="{escape(c["tablist"])}">{"".join(tabs)}</div>
    {"".join(panes)}
    <p class="small scn-hint">{escape(c["hint"])}</p>
  </div>
</section>

"""


def head_extra(meta: dict) -> str:
    return f"""<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="canonical" href="{SITE_URL}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Legion AI">
<meta property="og:locale" content="{meta['og_locale']}">
<meta property="og:locale:alternate" content="{meta['og_locale_alt']}">
<meta property="og:title" content="{meta['og_title']}">
<meta property="og:description" content="{meta['og_description']}">
<meta property="og:url" content="{SITE_URL}/">
<meta property="og:image" content="{SITE_URL}/img/{IMAGE_NAMES[0]}.jpg">
<meta name="twitter:card" content="summary_large_image">
"""


def lang_switch(locale: str) -> str:
    def btn(code: str) -> str:
        pressed = "true" if code == locale else "false"
        return f'<button type="button" data-lang="{code}" lang="{code}" aria-pressed="{pressed}">{code.upper()}</button>'

    return f'<div class="lang-sw" role="group" aria-label="Idioma / Language">{btn("es")}{btn("en")}</div>'


def localize(html: str, locale: str, meta: dict) -> str:
    html = html.replace("</style>", LANG_CSS + SCANNER_CSS + "</style>", 1)
    if html.count("<!-- PROTECTION -->") != 1:
        sys.exit("ERROR: no encuentro <!-- PROTECTION --> para insertar la sección del escáner")
    html = html.replace("<!-- PROTECTION -->", scanner_section(locale) + "<!-- PROTECTION -->", 1)
    html = html.replace('<link rel="preconnect"', head_extra(meta) + '<link rel="preconnect"', 1)
    html = html.replace(WHATSAPP_BTN, f'<div class="nav-end">{lang_switch(locale)}{WHATSAPP_BTN}', 1)
    html = re.sub(r'(<div class="nav-end">.*?</a>)', r"\1</div>", html, count=1, flags=re.S)
    scripts = "".join(
        f'<script src="/{name}?v={asset_version(name)}" defer></script>\n' for name in ("i18n.js", "scanner.js")
    )
    return html.replace("</body>", scripts + "</body>", 1)


def asset_version(name: str) -> str:
    return hashlib.sha256((ROOT / "assets" / name).read_bytes()).hexdigest()[:10]


def translate_es(html: str, es) -> str:
    tpl_en = re.search(r'<template id="panelTpl">.*?</template>', html, flags=re.S).group(0)
    missing = []
    for en, es_text in es.PAIRS:
        if en not in html:
            missing.append(en)
            continue
        html = html.replace(en, es_text)
    if missing:
        print("ERROR: textos de i18n/es.py que ya no existen en el original:", file=sys.stderr)
        for m in missing:
            print(f"  - {m[:110]}", file=sys.stderr)
        sys.exit(1)
    tpl_en = tpl_en.replace('id="panelTpl"', 'id="panelTplEn"', 1)
    return html.replace("<script>", tpl_en + "\n\n<script>", 1)


def draw_icon(size: int, content_ratio: float) -> Image.Image:
    """Dibuja el logo hexagonal de la página. content_ratio < 1 deja zona segura (maskable)."""
    scale_up = 4
    big = size * scale_up
    img = Image.new("RGB", (big, big), THEME)
    d = ImageDraw.Draw(img)
    box = big * content_ratio
    off = (big - box) / 2
    k = box / 34

    def p(x, y):
        return (off + x * k, off + y * k)

    hexagon = [p(17, 2), p(31, 10), p(31, 24), p(17, 32), p(3, 24), p(3, 10)]
    d.line(hexagon + [hexagon[0], hexagon[1]], fill="#2FC48A", width=max(2, int(2 * k)), joint="curve")
    pulse = [p(10, 21), p(15, 15), p(19, 18), p(24, 11)]
    w = max(2, int(2.4 * k))
    d.line(pulse, fill="#45E2A3", width=w, joint="curve")
    r = w / 2
    for x, y in (pulse[0], pulse[-1]):
        d.ellipse((x - r, y - r, x + r, y + r), fill="#45E2A3")
    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    html = src.read_text(encoding="utf-8")
    es = load_module("es")

    if src.resolve() != SOURCE.resolve():
        SOURCE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, SOURCE)

    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    (PUBLIC / "img").mkdir(parents=True)
    (PUBLIC / "icons").mkdir()

    pattern = re.compile(r"data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)")
    seen: dict[str, str] = {}

    def extract(m: re.Match) -> str:
        ext = "jpg" if m.group(1) == "jpeg" else m.group(1)
        data = base64.b64decode(m.group(2))
        digest = hashlib.sha256(data).hexdigest()[:10]
        if digest not in seen:
            idx = len(seen)
            name = IMAGE_NAMES[idx] if idx < len(IMAGE_NAMES) else f"image-{idx + 1}"
            fname = f"{name}.{ext}"
            (PUBLIC / "img" / fname).write_bytes(data)
            seen[digest] = f"/img/{fname}?v={digest}"
        return seen[digest]

    html = pattern.sub(extract, html)
    html = html.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
        1,
    )

    html_en = localize(html, "en", META_EN)
    html_es = localize(translate_es(html, es), "es", es.META)

    (PUBLIC / "index.en.html").write_text(html_en, encoding="utf-8")
    (PUBLIC / "index.es.html").write_text(html_es, encoding="utf-8")
    (PUBLIC / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    for name in ("i18n.js", "scanner.js"):
        shutil.copyfile(ROOT / "assets" / name, PUBLIC / name)
    shutil.copytree(SCANNER_SRC, PUBLIC / "img" / "scanner")
    (PUBLIC / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    (PUBLIC / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"<url><loc>{SITE_URL}/</loc></url></urlset>\n"
    )

    draw_icon(192, 0.78).save(PUBLIC / "icons" / "icon-192.png", optimize=True)
    draw_icon(180, 0.72).save(PUBLIC / "icons" / "apple-touch-icon.png", optimize=True)
    draw_icon(48, 0.86).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    print(
        f"index.es.html {len(html_es) // 1024} KB, index.en.html {len(html_en) // 1024} KB, "
        f"imágenes: {len(seen)}, pares es: {len(es.PAIRS)}"
    )


if __name__ == "__main__":
    main()
