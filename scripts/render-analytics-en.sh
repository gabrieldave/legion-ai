#!/usr/bin/env sh
# Renderiza la recreación en inglés del resumen de Analytics MT4 a PNG 2x (1340 px de ancho).
# Uso: scripts/render-analytics-en.sh   (luego: python3 scripts/build.py)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$ROOT/source/results/analytics-resumen-en.png"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=670,1400 --screenshot="$OUT" "file://$ROOT/source/results/analytics-en.html" >/dev/null 2>&1
python3 - "$OUT" <<'EOF'
import sys
from PIL import Image
p = sys.argv[1]
im = Image.open(p).convert("RGB")
bg = im.getpixel((2, im.height - 2))
bottom = im.height
while bottom > 0 and all(im.getpixel((x, bottom - 1)) == bg for x in range(0, im.width, 7)):
    bottom -= 1
im = im.crop((0, 0, im.width, min(im.height, bottom + 24)))
im.save(p, optimize=True)
print(p, im.size)
EOF
