"""Sección «El escáner por dentro»: capturas reales de cada pestaña del panel.

Las imágenes viven en source/scanner/ y el build las publica en /img/scanner/. Para la versión
en inglés, pon la captura con el panel en inglés y el MISMO nombre en source/scanner/en/; si
falta alguna, el inglés usa la de español y avisa que las capturas están en español.
Cada pestaña: label, title, what, how [(nombre, texto)], keys (opcional),
shots [(archivo, alt)] y figure (archivo, alt, pie) opcional a todo el ancho.
"""

ES = {
    "title": "Cada pestaña, tal como se ve en tu MT4.",
    "lead": "Capturas reales del escáner sobre el Oro. Elige una pestaña para ver qué hace y cómo se usa.",
    "tablist": "Pestañas del escáner",
    "how": "Cómo funciona",
    "hint": "Haz clic en cualquier captura para verla en tamaño completo.",
    "tabs": [
        {
            "label": "EN EL GRÁFICO",
            "title": "Todo el escáner trabajando sobre tu gráfico",
            "what": "El panel vive a la derecha y las herramientas dibujan directo sobre las velas. Lo que lees en el panel lo ves también en el precio.",
            "how": [
                ("Panel a la derecha", "Cuenta, lectura general, tablero RSI, pistola ADX, estructura, fuerza del par y FlowPulse en una sola columna que se pliega con la tecla P."),
                ("Estructura y Fibonacci", "Máximos y mínimos marcados, rupturas y los niveles de Fibonacci del último impulso, cada uno con su precio."),
                ("Order blocks y FVG", "Las franjas moradas y doradas son order blocks y huecos de valor justo de varias temporalidades, extendidas a la derecha para que veas dónde podría reaccionar el precio."),
                ("Volumen relativo", "Las barras de abajo se encienden cuando una vela trae actividad fuera de lo normal."),
                ("Reset de gráfico", "Un recuadro aparte para limpiar los objetos, restaurar la plantilla o hacer un reset total con un clic."),
            ],
            "shots": [("grafico-completo.jpg", "Gráfico del Oro en MetaTrader 4 con el panel Legion AI a la derecha, niveles de Fibonacci, order blocks y FVG")],
            "wide": True,
        },
        {
            "label": "VELA ZOOM",
            "title": "Vela Zoom: abre una vela y mira qué pasó adentro",
            "what": "Una vela semanal resume cinco días en cuatro precios. Vela Zoom la desarma en velas menores para que veas cómo se formó.",
            "how": [
                ("Elige la vela", "Pulsa SELECCIONAR (o S + clic en el gráfico) o ÚLTIMA VELA, y muévete con < y >. Funciona de MN1 a M5."),
                ("Ficha de la vela", "Apertura, máximo, mínimo, cierre, rango, porcentaje de cuerpo y de mechas, y si fue alcista o bajista."),
                ("Composición", "Cuántas velas internas fueron alcistas o bajistas, las rachas, en qué momento se formaron el máximo y el mínimo, la vela más grande y qué llegó primero."),
                ("Perfil de tiempo", "POC, VAH y VAL: los precios donde el mercado pasó más tiempo, y si el cierre quedó arriba o abajo de esa zona de valor."),
                ("Vela en curso", "Cuánto tiempo lleva abierta y en qué parte de su rango está el precio ahora mismo."),
            ],
            "keys": "Teclas: V vela zoom · Z / X zoom",
            "shots": [("vela-zoom.jpg", "Pestaña Vela Zoom del panel con la ficha de la vela semanal, su composición en M15, el desglose en H4 y el perfil de tiempo")],
            "figure": (
                "grafico-vela-zoom.jpg",
                "Vela semanal del Oro desarmada en velas menores sobre el gráfico, con perfil de precios y niveles de Fibonacci",
                "En el gráfico: la vela semanal desarmada en velas menores, con el perfil de precios a la izquierda (la barra azul es el POC) y los niveles de Fibonacci del movimiento.",
            ),
        },
        {
            "label": "QUIEBRE",
            "title": "Medidor de Quiebre: tu límite antes de entrar",
            "what": "Simula una operación y te dice el precio exacto donde tu bróker te cerraría todo. Solo simula: nunca abre ni modifica órdenes.",
            "how": [
                ("Arma la operación", "Compra o venta, lote, entrada a mercado o en una línea, y tu balance real (MI CUENTA) o uno de prueba (OTRO)."),
                ("Precio de quiebre", "La línea roja marca dónde te cierran y cuánto tendría que moverse el precio: en porcentaje y en días típicos de movimiento (ATR D1)."),
                ("Colchón", "Un semáforo resume la distancia al quiebre: AMPLIO, ATENCIÓN o PELIGRO."),
                ("Take profit y caídas", "Activa el TP para ver tu ganancia en el objetivo, o pinta una caída de referencia (por ejemplo, 30%) para ver si la aguantarías."),
                ("Los números completos", "Margen requerido, nivel de margen, valor del punto, pérdida hasta el quiebre, lote máximo por margen y el lote que te quebraría con un 5% en contra."),
            ],
            "shots": [("quiebre.jpg", "Pestaña Quiebre del panel simulando una compra de 0.10 lotes de Oro con el precio de quiebre y el colchón")],
        },
        {
            "label": "CAÍDAS",
            "title": "Caídas históricas: lo peor que ya pasó",
            "what": "Las mayores caídas del mercado que estás viendo, con fechas, profundidad y cuánto tardó en recuperarse. Sirve para elegir tu lote pensando en lo peor.",
            "how": [
                ("Históricas", "Cada evento con su pico, su mínimo y la caída total. En el Oro, el fin del rally 2011-15 fue de -45.53% en 4 años y 3 meses."),
                ("Tiempos del ciclo", "Tiempo en caer, tiempo en recuperar y ciclo completo, más la fecha en que el precio volvió a su pico."),
                ("Caída actual", "Mide la caída en curso del mercado para compararla con las de la tabla."),
                ("Lotaje seguro", "El lote más grande que tu balance aguantaría si se repitiera una caída así."),
                ("Medición manual", "Arrastra las líneas verde y roja para medir cualquier caída en tu gráfico."),
            ],
            "keys": "Tecla: H caídas",
            "shots": [("caidas.jpg", "Pestaña Caídas del panel mostrando la caída del Oro de 2011 a 2015, de 1,920.71 a 1,046.26")],
        },
        {
            "label": "OB + FVG",
            "title": "Order blocks y FVG con radar en cinco temporalidades",
            "what": "Marca las zonas donde los grandes jugadores dejaron huella y vigila por ti si el precio se acerca o ya entró en una.",
            "how": [
                ("Smart OB MTF", "Dibuja los order blocks de H1, H4, D1, W1 y MN1. Puedes fijar la temporalidad y ocultar las etiquetas."),
                ("OB Radar", "Por cada temporalidad: si el precio está LIBRE o DENTRO de una zona, si la zona es alcista o bajista, su rango, cuántos OB hay y a qué distancia está el precio."),
                ("FVG Radar", "Lo mismo para los huecos de valor justo (FVG): dirección y distancia en pips en cada temporalidad."),
                ("Aviso de cercanía", "Cuando el precio entra al umbral CERCA, el radar lo resalta para que no se te pase."),
            ],
            "keys": "Teclas: O order blocks · F FVG",
            "shots": [("ob-fvg.jpg", "Pestaña OB + FVG del panel con el radar de order blocks y de FVG en H1, H4, D1, W1 y MN1")],
        },
        {
            "label": "HERRAMIENTAS",
            "title": "Herramientas: sesiones, niveles y un gráfico a tu gusto",
            "what": "Las utilidades de todos los días, juntas en una sola pestaña.",
            "how": [
                ("Sesiones", "Cajas de Asia, Londres y Nueva York, con la sesión activa marcada."),
                ("Niveles PSY", "Los números redondos más cercanos arriba y abajo del precio, con la distancia a cada uno."),
                ("Plantillas de velas", "Nueve temas de color más los colores originales, sin quitar tus indicadores ni tus objetos."),
                ("Rectángulos con precio", "Dibuja un rectángulo y verás el precio de sus bordes. Puedes extenderlo, filtrar los de otros símbolos y mostrar altura, 50% y lado de la etiqueta."),
            ],
            "keys": "Teclas: E sesiones · Y niveles · R rectángulo",
            "shots": [("herramientas.jpg", "Pestaña Herramientas del panel con sesiones, niveles psicológicos, plantillas de velas y rectángulos con precio")],
        },
    ],
}

EN = {
    "title": "Every tab, exactly as it looks in your MT4.",
    "lead": "Real captures of the scanner on Gold. Pick a tab to see what it does and how to use it.",
    "tablist": "Scanner tabs",
    "how": "How it works",
    "hint": "Click any capture to see it full size. Captures are in Spanish; every label switches to English with the Language setting.",
    "hint_translated": "Click any capture to see it full size.",
    "tabs": [
        {
            "label": "ON THE CHART",
            "title": "The whole scanner working on your chart",
            "what": "The panel sits on the right and the tools draw straight onto the candles. What you read in the panel, you also see on price.",
            "how": [
                ("Panel on the right", "Account, overall reading, RSI grid, ADX gun, structure, pair strength and FlowPulse in one column that folds away with the P key."),
                ("Structure and Fibonacci", "Marked highs and lows, breakouts and the Fibonacci levels of the last impulse, each with its price."),
                ("Order blocks and FVG", "The purple and gold bands are order blocks and fair value gaps from several timeframes, extended to the right so you see where price could react."),
                ("Relative volume", "The bars at the bottom light up when a candle brings unusual activity."),
                ("Chart reset", "A separate box to clear objects, restore the template or run a full reset in one click."),
            ],
            "shots": [("grafico-completo.jpg", "Gold chart in MetaTrader 4 with the Legion AI panel on the right, Fibonacci levels, order blocks and FVG")],
            "wide": True,
        },
        {
            "label": "CANDLE ZOOM",
            "title": "Candle Zoom: open a candle and see what happened inside",
            "what": "A weekly candle squeezes five days into four prices. Candle Zoom breaks it into smaller candles so you see how it was built.",
            "how": [
                ("Pick the candle", "Press SELECT (or S + click on the chart) or LAST CANDLE, and step with < and >. Works from MN1 down to M5."),
                ("Candle card", "Open, high, low, close, range, body and wick percentages, and whether it closed bullish or bearish."),
                ("Composition", "How many inner candles were bullish or bearish, the streaks, when the high and the low formed, the biggest candle and which came first."),
                ("Time profile", "POC, VAH and VAL: the prices where the market spent the most time, and whether the close landed above or below that value area."),
                ("Live candle", "How long it has been open and where price sits in its range right now."),
            ],
            "keys": "Keys: V candle zoom · Z / X zoom",
            "shots": [("vela-zoom.jpg", "Candle Zoom tab showing the weekly candle card, its M15 composition, the H4 breakdown and the time profile")],
            "figure": (
                "grafico-vela-zoom.jpg",
                "Weekly Gold candle broken into smaller candles on the chart, with a price profile and Fibonacci levels",
                "On the chart: the weekly candle broken into smaller candles, with the price profile on the left (the blue bar is the POC) and the Fibonacci levels of the move.",
            ),
        },
        {
            "label": "WIPEOUT",
            "title": "Wipeout Meter: know your limit before you enter",
            "what": "Simulate a trade and see the exact price where your broker would close you out. It only simulates: it never opens or changes orders.",
            "how": [
                ("Set up the trade", "Buy or sell, lot size, market or line entry, and your real balance (MY ACCOUNT) or a test one (OTHER)."),
                ("Wipeout price", "The red line marks where you get closed out and how far price has to move: in percent and in typical daily moves (ATR D1)."),
                ("Cushion", "A traffic light sums up the distance to wipeout: WIDE, CAUTION or DANGER."),
                ("Take profit and drops", "Turn on the TP to see your profit at target, or paint a reference drop (for example 30%) to see if you would survive it."),
                ("Every number", "Required margin, margin level, point value, loss to wipeout, max lot by margin and the lot that would wipe you out on a 5% move against you."),
            ],
            "shots": [("quiebre.jpg", "Wipeout tab simulating a 0.10 lot Gold buy with the wipeout price and the cushion")],
        },
        {
            "label": "DROPS",
            "title": "Historical drops: the worst that already happened",
            "what": "The biggest drops of the market you are watching, with dates, depth and how long it took to recover. It helps you size your lot with the worst case in mind.",
            "how": [
                ("Historical", "Each event with its peak, its low and the total drop. On Gold, the end of the 2011-15 rally was -45.53% over 4 years and 3 months."),
                ("Cycle timing", "Time to fall, time to recover and the full cycle, plus the date price got back to its peak."),
                ("Current drop", "Measures the market's ongoing drop so you can compare it with the table."),
                ("Safe lot size", "The largest lot your balance could hold if a drop like that happened again."),
                ("Manual measure", "Drag the green and red lines to measure any drop on your chart."),
            ],
            "keys": "Key: H drops",
            "shots": [("caidas.jpg", "Drops tab showing Gold's 2011 to 2015 drop, from 1,920.71 to 1,046.26")],
        },
        {
            "label": "OB + FVG",
            "title": "Order blocks and FVG with a radar on five timeframes",
            "what": "Marks the zones where big players left footprints and watches for you whether price is getting close or already inside one.",
            "how": [
                ("Smart OB MTF", "Draws the order blocks of H1, H4, D1, W1 and MN1. You can lock the timeframe and hide the labels."),
                ("OB Radar", "For each timeframe: whether price is FREE or INSIDE a zone, whether the zone is bullish or bearish, its range, how many OBs there are and how far price is."),
                ("FVG Radar", "The same for fair value gaps: direction and distance in pips on each timeframe."),
                ("Proximity warning", "When price enters the NEAR threshold, the radar highlights it so you don't miss it."),
            ],
            "keys": "Keys: O order blocks · F FVG",
            "shots": [("ob-fvg.jpg", "OB + FVG tab with the order block and FVG radar on H1, H4, D1, W1 and MN1")],
        },
        {
            "label": "TOOLS",
            "title": "Tools: sessions, levels and a chart your way",
            "what": "The everyday utilities, together in one tab.",
            "how": [
                ("Sessions", "Asia, London and New York boxes, with the active session marked."),
                ("PSY levels", "The nearest round numbers above and below price, with the distance to each one."),
                ("Candle templates", "Nine color themes plus the original colors, without removing your indicators or objects."),
                ("Price rectangles", "Draw a rectangle and see the price of its edges. Extend it, filter the ones from other symbols and show height, 50% and label side."),
            ],
            "keys": "Keys: E sessions · Y levels · R rectangle",
            "shots": [("herramientas.jpg", "Tools tab with sessions, psychological levels, candle templates and price rectangles")],
        },
    ],
}
