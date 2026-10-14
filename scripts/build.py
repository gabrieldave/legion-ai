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

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6DF0BB"/><stop offset="1" stop-color="#1D9E70"/></linearGradient></defs><rect width="34" height="34" rx="7" fill="#04070F"/><path d="M17 2 31 10v14L17 32 3 24V10Z" fill="none" stroke="url(#lg)" stroke-width="2"/><path d="M10 21l5-6 4 3 5-7" fill="none" stroke="#45E2A3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
"""

MANIFEST = f"""{{
  "id": "/",
  "name": "Legion AI",
  "short_name": "Legion AI",
  "description": "MetaTrader 4 market panel / Panel de mercados para MetaTrader 4",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "{THEME}",
  "theme_color": "{THEME}",
  "icons": [
    {{ "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" }},
    {{ "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }},
    {{ "src": "/icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" }},
    {{ "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }}
  ]
}}
"""


def load_es():
    spec = importlib.util.spec_from_file_location("i18n_es", ROOT / "i18n" / "es.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def head_extra(meta: dict) -> str:
    return f"""<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Legion AI">
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
    html = html.replace("</style>", LANG_CSS + "</style>", 1)
    html = html.replace('<link rel="preconnect"', head_extra(meta) + '<link rel="preconnect"', 1)
    html = html.replace(WHATSAPP_BTN, f'<div class="nav-end">{lang_switch(locale)}{WHATSAPP_BTN}', 1)
    html = re.sub(r'(<div class="nav-end">.*?</a>)', r"\1</div>", html, count=1, flags=re.S)
    scripts = "".join(
        f'<script src="/{name}?v={asset_version(name)}" defer></script>\n' for name in ("i18n.js", "pwa-banner.js")
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
    es = load_es()

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
    (PUBLIC / "manifest.webmanifest").write_text(MANIFEST, encoding="utf-8")
    (PUBLIC / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    for name in ("pwa-banner.js", "i18n.js"):
        shutil.copyfile(ROOT / "assets" / name, PUBLIC / name)
    (PUBLIC / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n")
    (PUBLIC / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"<url><loc>{SITE_URL}/</loc></url></urlset>\n"
    )

    for size in (192, 512):
        draw_icon(size, 0.78).save(PUBLIC / "icons" / f"icon-{size}.png", optimize=True)
        draw_icon(size, 0.6).save(PUBLIC / "icons" / f"maskable-{size}.png", optimize=True)
    draw_icon(180, 0.72).save(PUBLIC / "icons" / "apple-touch-icon.png", optimize=True)
    draw_icon(48, 0.86).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    print(
        f"index.es.html {len(html_es) // 1024} KB, index.en.html {len(html_en) // 1024} KB, "
        f"imágenes: {len(seen)}, pares es: {len(es.PAIRS)}"
    )


if __name__ == "__main__":
    main()
