"""Bloque «reporte original» de la sección de resultados.

Sustituye las dos capturas inclinadas del HTML original. En español va la captura real de
Analytics MT4 (source/results/analytics-resumen.jpg: sin menú lateral y con el número de
cuenta oculto). La app solo existe en español, así que en inglés va una recreación con las
mismas cifras (source/results/analytics-en.html → scripts/render-analytics-en.sh).
"""

ORIGINAL = "analytics-resumen.jpg"

ES = {
    "image": ORIGINAL,
    "size": (670, 1024),
    "kicker": "REPORTE ORIGINAL · ANALYTICS MT4",
    "label": "Ganado en trading (neto)",
    "big": "+$101,663.21",
    "currency": "MXN",
    "usd": "≈ $5,585.89 USD a 18.20 MXN por dólar",
    "stats": [
        ("Ganancias", "$142,217.95 MXN", "mint"),
        ("Pérdidas", "-$40,554.74 MXN", "ember"),
        ("Operaciones", "104 · 95 ganadas", ""),
        ("Win rate", "91.3%", ""),
        ("Profit factor", "3.51", ""),
        ("Drawdown máx.", "$14,095.61 MXN", "amber"),
    ],
    "note": "Captura real del panel de rendimiento sincronizado con la cuenta. Solo recortamos el menú lateral y ocultamos el número de cuenta.",
    "alt": "Captura de Analytics MT4: resumen de la operativa con $101,663.21 MXN ganados en trading, 104 operaciones, 91.3% de acierto y profit factor 3.51",
    "hint": "Haz clic en la captura para verla en tamaño completo.",
}

EN = {
    "image": "analytics-resumen-en.png",
    "size": (670, 944),
    "kicker": "REAL ACCOUNT REPORT · ANALYTICS MT4",
    "label": "Net trading profit",
    "big": "+$101,663.21",
    "currency": "MXN",
    "usd": "≈ $5,585.89 USD at 18.20 MXN per dollar",
    "stats": [
        ("Gross profit", "$142,217.95 MXN", "mint"),
        ("Gross loss", "-$40,554.74 MXN", "ember"),
        ("Trades", "104 · 95 won", ""),
        ("Win rate", "91.3%", ""),
        ("Profit factor", "3.51", ""),
        ("Max drawdown", "$14,095.61 MXN", "amber"),
    ],
    "note": "Our performance dashboard only exists in Spanish, so this is an English recreation of the real report with the same numbers. The bar and weekly charts were redrawn from the original and are approximate.",
    "alt": "English recreation of the Analytics MT4 trading summary: 101,663.21 MXN net profit, 104 trades, 91.3% win rate and a 3.51 profit factor",
    "hint": "Click to enlarge.",
    "original_link": "See the original capture in Spanish",
}
