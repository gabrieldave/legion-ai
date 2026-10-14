#!/usr/bin/env python3
"""Genera public/ a partir del HTML original de Legion AI.

Uso:
    python3 scripts/build.py [ruta/al/Legion_AI_Premium_Page.html]

Sin argumento usa la copia versionada en source/Legion_AI_Premium_Page.html.
"""
import base64
import hashlib
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

IMAGE_NAMES = [
    "poster-gold-bitcoin",
    "poster-trade-smarter",
    "report-performance",
    "report-curve",
    "panel-spanish",
]

HEAD_EXTRA = f"""<link rel="manifest" href="/manifest.webmanifest">
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
<meta property="og:title" content="Legion AI | The smart market panel for MetaTrader 4">
<meta property="og:description" content="One panel reads every timeframe of Gold, Bitcoin, indices and forex and tells you whether to wait, look for buys or look for sells.">
<meta property="og:url" content="{SITE_URL}/">
<meta property="og:image" content="{SITE_URL}/img/{IMAGE_NAMES[0]}.jpg">
<meta name="twitter:card" content="summary_large_image">
"""

FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6DF0BB"/><stop offset="1" stop-color="#1D9E70"/></linearGradient></defs><rect width="34" height="34" rx="7" fill="#04070F"/><path d="M17 2 31 10v14L17 32 3 24V10Z" fill="none" stroke="url(#lg)" stroke-width="2"/><path d="M10 21l5-6 4 3 5-7" fill="none" stroke="#45E2A3" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
"""

MANIFEST = f"""{{
  "id": "/",
  "name": "Legion AI",
  "short_name": "Legion AI",
  "description": "The smart market panel for MetaTrader 4.",
  "lang": "en",
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
    if 'rel="manifest"' not in html:
        html = html.replace("<link rel=\"preconnect\"", HEAD_EXTRA + "<link rel=\"preconnect\"", 1)
    if "pwa-banner.js" not in html:
        html = html.replace("</body>", '<script src="/pwa-banner.js" defer></script>\n</body>', 1)

    (PUBLIC / "index.html").write_text(html, encoding="utf-8")
    (PUBLIC / "manifest.webmanifest").write_text(MANIFEST, encoding="utf-8")
    (PUBLIC / "favicon.svg").write_text(FAVICON_SVG, encoding="utf-8")
    shutil.copyfile(ROOT / "assets" / "pwa-banner.js", PUBLIC / "pwa-banner.js")
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

    print(f"index.html {len(html) // 1024} KB, imágenes extraídas: {len(seen)}")


if __name__ == "__main__":
    main()
