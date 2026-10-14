"""Bloque «reporte original» de la sección de resultados.

Sustituye las dos capturas inclinadas del HTML original por la captura plana de
Analytics MT4 (source/results/analytics-resumen.jpg: sin menú lateral y con el número
de cuenta oculto). Cifras tal cual del reporte, en pesos mexicanos.
"""

IMAGE = "analytics-resumen.jpg"
SIZE = (670, 1024)

ES = {
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
    "kicker": "ORIGINAL REPORT · ANALYTICS MT4",
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
    "note": "A real capture of the performance dashboard synced to the account, in Spanish and Mexican pesos. We only cropped the side menu and hid the account number.",
    "alt": "Analytics MT4 capture: trading summary showing 101,663.21 MXN net profit, 104 trades, 91.3% win rate and a 3.51 profit factor",
    "hint": "Click the capture to see it full size.",
}
