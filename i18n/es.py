"""Traducción al español de la landing de Legion AI.

Cada par (inglés, español) se aplica en orden sobre el HTML original. Si un texto en inglés
ya no aparece en el original, scripts/build.py falla y lista los pares que hay que actualizar.
Los textos del panel recreado usan el diccionario TR_Add del indicador (sin acentos, como MT4).
"""

META = {
    "title": "Legion AI | El panel inteligente de mercados para MetaTrader 4",
    "description": (
        "Legion AI es un panel inteligente para MetaTrader 4. Lee todas las temporalidades del Oro, "
        "Bitcoin, índices y forex a la vez y te dice en palabras simples si esperar, buscar compras o buscar ventas."
    ),
    "og_title": "Legion AI | El panel inteligente de mercados para MetaTrader 4",
    "og_description": (
        "Un panel lee todas las temporalidades del Oro, Bitcoin, índices y forex y te dice si esperar, "
        "buscar compras o buscar ventas."
    ),
    "og_locale": "es_MX",
    "og_locale_alt": "en_US",
}

PAIRS = [
    # ---------- head ----------
    ('<html lang="en">', '<html lang="es">'),
    ("<title>Legion AI | The smart market panel for MetaTrader 4</title>", f"<title>{META['title']}</title>"),
    (
        '<meta name="description" content="Legion AI is a smart panel for MetaTrader 4. It reads every timeframe of Gold, Bitcoin, indices and forex at once and tells you in plain English whether to wait, look for buys or look for sells.">',
        f'<meta name="description" content="{META["description"]}">',
    ),

    # ---------- header ----------
    ('aria-label="Legion AI home"', 'aria-label="Inicio de Legion AI"'),
    ('<nav aria-label="Main">', '<nav aria-label="Principal">'),
    (">The panel</a>", ">El panel</a>"),
    (">How it reads</a>", ">Cómo lee</a>"),
    (">Protection</a>", ">Protección</a>"),
    (">Results</a>", ">Resultados</a>"),
    (">FAQ</a>", ">Preguntas</a>"),
    (">Talk to us</a>", ">Escríbenos</a>"),

    # ---------- hero ----------
    ('aria-label="Introduction"', 'aria-label="Introducción"'),
    ("<h1>See what the market is doing before you risk a dollar.</h1>", "<h1>Mira lo que hace el mercado antes de arriesgar un dólar.</h1>"),
    (
        "Legion AI is a smart panel for MetaTrader 4. It watches every timeframe of Gold, Bitcoin, indices and forex at the same time, and tells you in plain English whether to wait, look for buys or look for sells.",
        "Legion AI es un panel inteligente para MetaTrader 4. Vigila todas las temporalidades del Oro, Bitcoin, índices y forex al mismo tiempo, y te dice en palabras simples si esperar, buscar compras o buscar ventas.",
    ),
    (">Get Legion AI</a>", ">Quiero Legion AI</a>"),
    (">Tour the panel</a>", ">Recorre el panel</a>"),
    ("<span>tools in one panel</span>", "<span>herramientas en un panel</span>"),
    ("<span>timeframes, M1 to MN</span>", "<span>temporalidades, de M1 a MN</span>"),
    ("<span>trades placed for you</span>", "<span>operaciones que abre por ti</span>"),
    ("Overall reading<b>", "Lectura general<b>"),
    ("Confidence<b ", "Confianza<b "),

    # ---------- panel: veredictos (globales, en mayúsculas) ----------
    ("SELL WITHOUT SUPPORT", "VENTA SIN RESPALDO"),
    ("BUY CONFIRMED", "COMPRA CONFIRMADA"),
    ("SELL BIAS", "SESGO VENDEDOR"),
    ("BUY BIAS", "SESGO COMPRADOR"),
    ("WATCH EXIT", "VIGILAR SALIDA"),
    ("EXIT NOW", "SALIR AHORA"),

    # ---------- mercados ----------
    ("Works on any symbol your MT4 broker offers, including", "Funciona con cualquier símbolo que ofrezca tu bróker de MT4, incluidos"),
    ("></i>Gold</span>", "></i>Oro</span>"),
    ("></i>Forex pairs</span>", "></i>Pares de forex</span>"),

    # ---------- panel nativo ----------
    ("<h2>The real panel, now fully in English.</h2>", "<h2>El panel real, tal como lo ves en MT4.</h2>"),
    (
        "This is Legion AI exactly as it sits on the right side of your MT4 chart: one column, six tabs, every reading explained by a tooltip when you hover it.",
        "Así se ve Legion AI a la derecha de tu gráfico de MT4: una columna, seis pestañas y cada lectura explicada con un tooltip al pasar el cursor.",
    ),
    (
        "<h3>Overall reading</h3><p>One verdict for the whole market, with a confidence score that measures how much the tools agree.</p>",
        "<h3>Lectura general</h3><p>Un solo veredicto para todo el mercado, con un puntaje de confianza que mide cuánto coinciden las herramientas.</p>",
    ),
    (
        "<h3>Your account, live</h3><p>Balance, equity, margin level, leverage and the price where your broker would close you out.</p>",
        "<h3>Tu cuenta, en vivo</h3><p>Balance, equidad, nivel de margen, apalancamiento y el precio donde tu bróker te cerraría todo.</p>",
    ),
    (
        "<h3>Momentum on 6 timeframes</h3><p>Each square is one candle. Green rows lean up, red rows lean down, gray means undecided.</p>",
        "<h3>Impulso en 6 temporalidades</h3><p>Cada cuadro es una vela. Las filas verdes se inclinan al alza, las rojas a la baja y el gris indica indecisión.</p>",
    ),
    (
        "<h3>Trend grid</h3><p>Trend strength from 1-minute to monthly. When it says Do not enter, it means it.</p>",
        "<h3>Tablero de tendencia</h3><p>Fuerza de la tendencia de 1 minuto a mensual. Cuando dice No entres, va en serio.</p>",
    ),
    ("English recreation of a real panel capture (XAUUSD, 15-minute chart).", "Recreación de una captura real del panel (XAUUSD, gráfico de 15 minutos)."),
    (
        "<h3>Six module scores</h3><p>RSI, ADX, Flow, Pair, Structure and Candle each vote from -100 to +100.</p>",
        "<h3>Seis módulos con puntaje</h3><p>RSI, ADX, Flow, Par, Estructura y Vela votan cada uno de -100 a +100.</p>",
    ),
    (
        "<h3>Reading in plain words</h3><p>A short line per tool, so you know why the panel thinks what it thinks.</p>",
        "<h3>Lectura en palabras simples</h3><p>Una línea corta por herramienta, para que sepas por qué el panel piensa lo que piensa.</p>",
    ),
    (
        "<h3>Market structure</h3><p>Is each timeframe pushing or pulling back, and where it breaks. Monthly down to 1-minute.</p>",
        "<h3>Estructura de mercado</h3><p>Si cada temporalidad está impulsando o corrigiendo, y dónde se rompe. De mensual a 1 minuto.</p>",
    ),
    (
        "<h3>Buyers vs. sellers</h3><p>FlowPulse scores 20 windows, from the last minute to the last 8 days.</p>",
        "<h3>Compradores vs. vendedores</h3><p>FlowPulse puntúa 20 ventanas, del último minuto a los últimos 8 días.</p>",
    ),

    # ---------- galería ----------
    ("On your desk, with alerts in your pocket.</h2>", "En tu escritorio, con alertas en tu bolsillo.</h2>"),
    (
        "Legion AI runs inside MetaTrader 4 on your computer or VPS. When a signal fires, it can reach you as a pop-up, a sound, an email or a push notification on the MT4 app on your phone.",
        "Legion AI corre dentro de MetaTrader 4 en tu computadora o VPS. Cuando salta una señal, te puede llegar como ventana emergente, sonido, correo o notificación push en la app de MT4 de tu teléfono.",
    ),
    ("Click either poster to bring it to the front.", "Haz clic en cualquier póster para traerlo al frente."),
    (
        "Legion AI campaign poster: an MT4 system for Gold, Bitcoin, S&amp;P 500, Nasdaq, US30 and DXY, with AI-powered analysis and real-time multi-timeframe reading",
        "Póster de campaña de Legion AI: un sistema de MT4 para Oro, Bitcoin, S&amp;P 500, Nasdaq, US30 y DXY, con análisis con IA y lectura multitemporal en tiempo real",
    ),
    (
        "Legion AI campaign poster: Trade smarter, not harder. Real-time AI market scanner, multi-timeframe analysis and trend and pattern detection",
        "Póster de campaña de Legion AI: opera con inteligencia, no con más esfuerzo. Escáner de mercado con IA en tiempo real, análisis multitemporal y detección de tendencias y patrones",
    ),
    ("Bring the desktop poster to the front", "Traer al frente el póster de escritorio"),
    ("Bring the mobile poster to the front", "Traer al frente el póster móvil"),
    ("Legion AI campaign artwork. Screens in the posters are illustrations.", "Arte de campaña de Legion AI. Las pantallas de los pósters son ilustraciones."),

    # ---------- seis voces ----------
    ("<h2>Six analysts vote. You get one clear answer.</h2>", "<h2>Seis analistas votan. Tú recibes una respuesta clara.</h2>"),
    (
        "Each tool looks at the market from a different angle and scores it from -100 (sellers in control) to +100 (buyers in control). Legion AI weighs the votes, checks how much they agree, and stacks it all into one reading.",
        "Cada herramienta mira el mercado desde un ángulo distinto y lo puntúa de -100 (dominan los vendedores) a +100 (dominan los compradores). Legion AI pondera los votos, revisa cuánto coinciden y lo resume todo en una sola lectura.",
    ),
    ("<span>CANDLE</span>", "<span>VELA</span>"),
    ("<span>STRUCTURE</span>", "<span>ESTRUCTURA</span>"),
    ("<span>PAIR</span>", "<span>PAR</span>"),
    ("<span>STRUCT</span>", "<span>ESTR</span>"),
    ("<b>STRUCT</b>", "<b>ESTR</b>"),
    ("<b>PAIR</b>", "<b>PAR</b>"),
    ("<b>CANDLE</b>", "<b>VELA</b>"),
    (
        "<h3>Is price speeding up?</h3><p>Momentum on six timeframes at once, with overbought and oversold warnings.</p>",
        "<h3>¿El precio está acelerando?</h3><p>Impulso en seis temporalidades a la vez, con avisos de sobrecompra y sobreventa.</p>",
    ),
    (
        "<h3>Is there a real trend?</h3><p>Strong trends light the grid up; choppy markets stay gray.</p>",
        "<h3>¿Hay una tendencia real?</h3><p>Las tendencias fuertes encienden el tablero; los mercados laterales se quedan en gris.</p>",
    ),
    (
        "<h3>Who is pushing?</h3><p>Where price sits inside its recent range, from minutes to weeks.</p>",
        "<h3>¿Quién está empujando?</h3><p>Dónde está el precio dentro de su rango reciente, de minutos a semanas.</p>",
    ),
    (
        "<h3>Higher highs or lower lows?</h3><p>Structure on the weekly, daily and 4-hour charts.</p>",
        "<h3>¿Máximos más altos o mínimos más bajos?</h3><p>Estructura en los gráficos semanal, diario y de 4 horas.</p>",
    ),
    (
        "<h3>Which side is stronger?</h3><p>Gold vs. the dollar, the euro vs. the dollar, scored 0 to 10.</p>",
        "<h3>¿Qué lado es más fuerte?</h3><p>Oro contra el dólar y euro contra el dólar, con puntaje de 0 a 10.</p>",
    ),
    (
        "<h3>Who won the big candle?</h3><p>Did the key candle close near its high or near its low?</p>",
        "<h3>¿Quién ganó la vela grande?</h3><p>¿La vela clave cerró cerca de su máximo o de su mínimo?</p>",
    ),
    (
        "Right column: default weight of each vote. You can change every weight in the settings.",
        "Columna derecha: peso por defecto de cada voto. Puedes cambiar cada peso en la configuración.",
    ),

    # ---------- escalera de lecturas ----------
    ("Every reading tells you what to do next.</h2>", "Cada lectura te dice qué hacer después.</h2>"),
    (
        "No lines to interpret. The panel moves through clear stages, from waiting to getting out, and says it in one sentence.",
        "Sin líneas que interpretar. El panel avanza por etapas claras, de esperar a salir, y te lo dice en una frase.",
    ),
    ('aria-label="Panel readings and their meaning"', 'aria-label="Lecturas del panel y su significado"'),
    ("></i>WAIT</span>", "></i>ESPERAR</span>"),
    ("No clear edge. Patience: not trading is also a position.", "Sin ventaja clara. Paciencia: no operar también es una posición."),
    (">Tools disagree<", ">Las herramientas no coinciden<"),
    ("Moderate buyer edge. Wait for the ADX gun to enter.", "Ventaja compradora moderada. Espera la pistola ADX para entrar."),
    (">Most tools lean up<", ">La mayoría se inclina al alza<"),
    ("Moderate seller edge. Wait for the ADX gun to enter.", "Ventaja vendedora moderada. Espera la pistola ADX para entrar."),
    (">Most tools lean down<", ">La mayoría se inclina a la baja<"),
    ("Buy gun with support. Valid entry: define your stop loss and lot size.", "Pistola de compra con respaldo. Entrada válida: define tu stop loss y tu lote."),
    (">Arrow plus agreement<", ">Flecha con acuerdo<"),
    ("The gun marked sell but the rest does not agree. Low quality.", "La pistola marcó venta pero el resto no acompaña. Baja calidad."),
    (">Arrow, no agreement<", ">Flecha sin acuerdo<"),
    ("Trade open against the confluence. Watch the exit closely.", "Operación abierta contra la confluencia. Vigila la salida de cerca."),
    (">Market turned on you<", ">El mercado se volteó en tu contra<"),
    ("The trigger changed sides. Protect profits or close the position.", "El gatillo cambió de lado. Protege ganancias o cierra la posición."),
    (">Trend flipped<", ">La tendencia giró<"),
    (
        "Sentences shown are the panel's own wording. The confidence score measures agreement between tools; it is not a probability of winning.",
        "Las frases son textuales del panel. La confianza mide el acuerdo entre herramientas; no es una probabilidad de ganar.",
    ),

    # ---------- paisaje RSI ----------
    (
        "3D landscape of the RSI grid: six timeframes by ten candles, taller red blocks show stronger selling, taller green blocks show stronger buying",
        "Paisaje 3D del tablero RSI: seis temporalidades por diez velas; los bloques rojos más altos indican más presión vendedora y los verdes más altos, más presión compradora",
    ),
    (
        "The RSI grid from the panel above, turned into a landscape. Taller blocks mean a stronger lean.",
        "El tablero RSI del panel de arriba convertido en paisaje. Los bloques más altos indican una inclinación más fuerte.",
    ),
    ("From the 1&#8209;minute to the monthly, in one glance.</h2>", "De 1&#8209;minuto a mensual, de un solo vistazo.</h2>"),
    (
        "<h3>When everything lines up, you see it</h3><p>Fast traders and big money rarely agree. When every timeframe turns the same color, the move usually has fuel behind it.</p>",
        "<h3>Cuando todo se alinea, lo ves</h3><p>Los traders rápidos y el dinero grande rara vez coinciden. Cuando todas las temporalidades se pintan del mismo color, el movimiento suele tener combustible detrás.</p>",
    ),
    (
        "<h3>Arrows only on closed candles</h3><p>The ADX gun waits for the candle to close before it marks an entry, so the arrow does not appear and disappear while you watch.</p>",
        "<h3>Flechas solo en velas cerradas</h3><p>La pistola ADX espera a que cierre la vela antes de marcar una entrada, así la flecha no aparece y desaparece mientras miras.</p>",
    ),
    (
        "<h3>It checks itself</h3><p>The panel tests its own pattern on your chart's history. If it has been losing lately, it shows Do not enter instead of an arrow.</p>",
        "<h3>Se revisa a sí mismo</h3><p>El panel prueba su propio patrón en el historial de tu gráfico. Si últimamente ha estado perdiendo, muestra No entres en lugar de una flecha.</p>",
    ),
    ("'10 candles ago'", "'hace 10 velas'"),
    ("'newest candle'", "'vela más reciente'"),

    # ---------- herramientas ----------
    ("Fourteen tools. One clean chart.</h2>", "Catorce herramientas. Un gráfico limpio.</h2>"),
    (
        "Every tool lives in its own tab and folds away with one key. Turn on what you use, hide the rest.",
        "Cada herramienta vive en su propia pestaña y se pliega con una tecla. Enciende lo que usas y oculta el resto.",
    ),
    ("<h3>Read the market</h3>", "<h3>Lee el mercado</h3>"),
    ("<p>Know the direction before you look for a trade.</p>", "<p>Conoce la dirección antes de buscar una operación.</p>"),
    (
        "<b>AI Status</b><span>Wait, buy bias or sell bias, a confidence score and a one-line explanation.</span>",
        "<b>Estado IA</b><span>Esperar, sesgo comprador o sesgo vendedor, un puntaje de confianza y una explicación en una línea.</span>",
    ),
    (
        "<b>RSI Scanner</b><span>Momentum on up to six timeframes, with streaks and overbought / oversold warnings.</span>",
        "<b>Escáner RSI</b><span>Impulso en hasta seis temporalidades, con rachas y avisos de sobrecompra / sobreventa.</span>",
    ),
    (
        "<b>Pair Strength</b><span>Which side of the pair is really stronger, from 0 to 10.</span>",
        "<b>Fuerza del Par</b><span>Qué lado del par es realmente más fuerte, de 0 a 10.</span>",
    ),
    (
        "<b>FlowPulse</b><span>Buyers vs. sellers over 20 windows, from one minute to eight days.</span>",
        "<b>FlowPulse</b><span>Compradores vs. vendedores en 20 ventanas, de un minuto a ocho días.</span>",
    ),
    ("<h3>Time your entry</h3>", "<h3>Elige el momento de entrar</h3>"),
    ("<p>Find the moment, not just the direction.</p>", "<p>Encuentra el momento, no solo la dirección.</p>"),
    (
        "<b>ADX Gun</b><span>Trend-strength grid with entry arrows on closed candles and a history test.</span>",
        "<b>Pistola ADX</b><span>Tablero de fuerza de tendencia con flechas de entrada en velas cerradas y prueba en el historial.</span>",
    ),
    (
        "<b>Market Structure</b><span>Trend from monthly to 1-minute, breakouts, trend changes and Fibonacci entry zones.</span>",
        "<b>Estructura de Mercado</b><span>Tendencia de mensual a 1 minuto, rupturas, cambios de tendencia y zonas de entrada Fibonacci.</span>",
    ),
    (
        "<b>Order Blocks + FVG Radar</b><span>Zones where big players left footprints, with an alert when price gets close.</span>",
        "<b>Order Blocks + Radar FVG</b><span>Zonas donde los grandes jugadores dejaron huella, con alerta cuando el precio se acerca.</span>",
    ),
    (
        "<b>Relative Volume</b><span>Flags candles with unusual activity compared to a normal day.</span>",
        "<b>Volumen Relativo</b><span>Marca las velas con actividad inusual frente a un día normal.</span>",
    ),
    ("<h3>Protect your account</h3>", "<h3>Protege tu cuenta</h3>"),
    ("<p>Size your trades with the math already done.</p>", "<p>Calcula el tamaño de tus operaciones con la matemática ya hecha.</p>"),
    (
        "<b>Account Card</b><span>Balance, equity, floating P/L, margin level and leverage, always on screen.</span>",
        "<b>Tarjeta de Cuenta</b><span>Balance, equidad, P/L flotante, nivel de margen y apalancamiento, siempre en pantalla.</span>",
    ),
    (
        "<b>Wipeout Meter</b><span>Simulate any trade and see the exact price where your broker would close it.</span>",
        "<b>Medidor de Quiebre</b><span>Simula cualquier operación y ve el precio exacto donde tu bróker la cerraría.</span>",
    ),
    (
        "<b>Historical Drops</b><span>The biggest crashes of your market and the safe lot size for your balance.</span>",
        "<b>Caídas Históricas</b><span>Los mayores desplomes de tu mercado y el lote seguro para tu balance.</span>",
    ),
    ("<h3>Work faster</h3>", "<h3>Trabaja más rápido</h3>"),
    ("<p>Small things that save time every day.</p>", "<p>Detalles que te ahorran tiempo todos los días.</p>"),
    (
        "<b>Candle Zoom</b><span>Click any candle to see what happened inside it, smaller candle by smaller candle.</span>",
        "<b>Vela Zoom</b><span>Haz clic en cualquier vela para ver qué pasó dentro de ella, vela por vela en temporalidades menores.</span>",
    ),
    (
        "<b>Sessions + Key Levels</b><span>Tokyo, London and New York boxes, plus the round numbers traders watch.</span>",
        "<b>Sesiones + Niveles Clave</b><span>Cajas de Tokio, Londres y Nueva York, más los números redondos que vigilan los traders.</span>",
    ),
    (
        "<b>Chart Tools</b><span>Price rectangles, a measuring crosshair, 9 chart themes, hotkeys and phone alerts.</span>",
        "<b>Herramientas de Gráfico</b><span>Rectángulos de precio, cruz de medición, 9 temas de gráfico, atajos de teclado y alertas al teléfono.</span>",
    ),

    # ---------- protección ----------
    (
        "Know where your broker would close you out, before you click buy.</h2>",
        "Conoce dónde te cerraría el bróker antes de hacer clic en comprar.</h2>",
    ),
    (
        "Most blown accounts are not one bad idea. They are one position that was too big. The Wipeout Meter is a flight simulator for your trade: nothing is sent to your broker.",
        "La mayoría de las cuentas quemadas no vienen de una mala idea, sino de una posición demasiado grande. El Medidor de Quiebre es un simulador de vuelo para tu operación: no se envía nada a tu bróker.",
    ),
    (
        "Simulated buy on Gold: blue entry line at 4,082.73, green take profit above at 4,180, amber broker warning at 3,968 and red wipeout line at 3,912 below",
        "Compra simulada en Oro: línea azul de entrada en 4,082.73, take profit verde arriba en 4,180, aviso del bróker en ámbar en 3,968 y línea roja de quiebre abajo en 3,912",
    ),
    ("TAKE PROFIT   4,180.00   (you would have $25,844)", "TAKE PROFIT   4,180.00   (tendrías $25,844)"),
    ("SIMULATED ENTRY   4,082.73   (drag the line)", "ENTRADA SIMULADA   4,082.73   (arrastra la línea)"),
    ("BROKER WARNING   3,968.10   (you have $9,560 left)", "AVISO DEL BRÓKER   3,968.10   (te quedan $9,560)"),
    ("WIPEOUT: EVERYTHING GETS CLOSED   3,912.40", "QUIEBRE: TE CIERRAN TODO   3,912.40"),
    (">Distance to wipeout</text>", ">Distancia al quiebre</text>"),
    (">CAUTION  2.1 ATR D1</text>", ">ATENCIÓN  2.1 ATR D1</text>"),
    (
        "<h3>Pick a direction and a lot size</h3><p>A red line appears where your broker would close everything. The percentage tells you how far price has to fall.</p>",
        "<h3>Elige dirección y lote</h3><p>Aparece una línea roja donde tu bróker cerraría todo. El porcentaje te dice cuánto tiene que caer el precio.</p>",
    ),
    (
        "<h3>Drag the green line to your target</h3><p>See your profit at the take profit before you place a single order.</p>",
        "<h3>Arrastra la línea verde a tu objetivo</h3><p>Ve tu ganancia en el take profit antes de colocar una sola orden.</p>",
    ),
    (
        "<h3>Wide, Caution or Danger</h3><p>The meter measures the distance to the wipeout line in typical days of movement, so you know if your cushion is real.</p>",
        "<h3>Amplio, Atención o Peligro</h3><p>El medidor calcula la distancia a la línea de quiebre en días típicos de movimiento, para que sepas si tu colchón es real.</p>",
    ),
    (
        "Illustrative values for a $23,900 account buying Gold. No commissions or swap included.",
        "Valores ilustrativos para una cuenta de $23,900 comprando Oro. No incluye comisiones ni swap.",
    ),

    # ---------- caídas históricas ----------
    ("Markets fall. The question is whether your account survives.</h2>", "Los mercados caen. La pregunta es si tu cuenta sobrevive.</h2>"),
    (
        "Legion AI carries the biggest drops of five markets inside the panel. It uses them to tell you the largest lot your balance could hold through a similar fall.",
        "Legion AI guarda dentro del panel las mayores caídas de cinco mercados. Las usa para decirte el lote más grande que tu balance aguantaría en una caída similar.",
    ),
    ('aria-label="Choose a market"', 'aria-label="Elige un mercado"'),
    (
        "Bar = fall from peak to low. Right column = time from the low back to the old high.",
        "Barra = caída de máximo a mínimo. Columna derecha = tiempo desde el mínimo hasta recuperar el máximo anterior.",
    ),
    (
        "Source: the event table built into Legion AI. Depths are approximate, based on closing prices.",
        "Fuente: la tabla de eventos integrada en Legion AI. Las profundidades son aproximadas, basadas en precios de cierre.",
    ),
    ("'Gold': [[", "'Oro': [["),
    ("'Stagflation'", "'Estanflación'"),
    ("'Black Monday'", "'Lunes Negro'"),
    ("'Dot-com bust'", "'Estallido punto com'"),
    ("'Dot-com bubble'", "'Burbuja punto com'"),
    ("'Dot-com + 9/11'", "'Punto com + 11-S'"),
    ("'Financial crisis'", "'Crisis financiera'"),
    ("'COVID crash'", "'Desplome COVID'"),
    ("'Inflation and rates'", "'Inflación y tasas'"),
    ("'Tariff shock'", "'Choque arancelario'"),
    ("'Bear market 2014'", "'Mercado bajista 2014'"),
    ("'Bear market 2018'", "'Mercado bajista 2018'"),
    ("'Bear market 2022'", "'Mercado bajista 2022'"),
    ("'Correction 1975-76'", "'Corrección 1975-76'"),
    ("'Correction 2020-22'", "'Corrección 2020-22'"),
    ("'Correction 2024'", "'Corrección 2024'"),
    ("'End of the 70s rally'", "'Fin del rally de los 70'"),
    ("'End of the 2011-15 rally'", "'Fin del rally 2011-15'"),
    ("'Mt.Gox bubble'", "'Burbuja Mt.Gox'"),
    ("'China mining ban'", "'Prohibición minera en China'"),
    ("'Cycle 2025-26'", "'Ciclo 2025-26'"),
    ("% to -", "% a -"),
    (
        "['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']",
        "['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']",
    ),
    ("'under a month'", "'menos de un mes'"),
    ("(m === 1 ? ' month' : ' months')", "(m === 1 ? ' mes' : ' meses')"),
    ("+ ' years'", "+ ' años'"),
    ("md(d[1]) + ' to ' + md(d[2])", "md(d[1]) + ' a ' + md(d[2])"),
    ("'back in ' + dur(", "'recuperó en ' + dur("),
    ("'not recovered yet'", "'aún sin recuperar'"),
    ("' peak to low\"", "' de máximo a mínimo\""),

    # ---------- resultados ----------
    ("One live account, seven weeks, every number shown.</h2>", "Una cuenta real, siete semanas, todos los números a la vista.</h2>"),
    (
        "Synced results of a live account traded by our team from July 30 to September 18. The report is in Mexican pesos; we converted it to US dollars at 18.20 MXN per USD. A person placed every trade, not the panel.",
        "Resultados sincronizados de una cuenta real operada por nuestro equipo del 30 de julio al 18 de septiembre. El reporte está en pesos mexicanos; lo convertimos a dólares a 18.20 MXN por USD. Cada operación la abrió una persona, no el panel.",
    ),
    ('<div class="k">Net profit</div>', '<div class="k">Ganancia neta</div>'),
    (">after commissions and swap<", ">después de comisiones y swap<"),
    ('<div class="k">Win rate</div>', '<div class="k">Tasa de acierto</div>'),
    (">95 of 104 closed trades<", ">95 de 104 operaciones cerradas<"),
    ('<div class="k">Profit factor</div>', '<div class="k">Factor de beneficio</div>'),
    (">$3.51 won per $1 lost<", ">$3.51 ganados por cada $1 perdido<"),
    ('<div class="k">Max drawdown</div>', '<div class="k">Drawdown máximo</div>'),
    (">worst peak-to-valley dip<", ">peor caída de pico a valle<"),
    (">Cumulative net profit</h3>", ">Ganancia neta acumulada</h3>"),
    (">Closed trades, USD</p>", ">Operaciones cerradas, USD</p>"),
    (
        "Line chart of cumulative net profit rising from 0 on July 30 to 5,585.89 dollars on September 18, with a pullback around August 20",
        "Gráfico de línea de la ganancia neta acumulada, que sube de 0 el 30 de julio a 5,585.89 dólares el 18 de septiembre, con un retroceso cerca del 20 de agosto",
    ),
    ("<title>Sep 18: +$5,585.89</title>", "<title>18 sep: +$5,585.89</title>"),
    ("<title>Aug 20: biggest pullback of the period</title>", "<title>20 ago: mayor retroceso del periodo</title>"),
    (">Jul 30</text>", ">30 jul</text>"),
    (">Aug 6</text>", ">6 ago</text>"),
    (">Aug 13</text>", ">13 ago</text>"),
    (">Aug 20</text>", ">20 ago</text>"),
    (">Aug 27</text>", ">27 ago</text>"),
    (">Sep 3</text>", ">3 sep</text>"),
    (">Sep 10</text>", ">10 sep</text>"),
    (">Sep 18</text>", ">18 sep</text>"),
    (
        "Traced from the account report. Start and end values are exact; points in between are approximate.",
        "Trazado a partir del reporte de la cuenta. Los valores inicial y final son exactos; los puntos intermedios son aproximados.",
    ),
    ('aria-label="95 winning trades and 9 losing trades"', 'aria-label="95 operaciones ganadoras y 9 perdedoras"'),
    (">Winning vs. losing trades</h3>", ">Operaciones ganadoras vs. perdedoras</h3>"),
    ('title="95 winners"', 'title="95 ganadoras"'),
    ('title="9 losers"', 'title="9 perdedoras"'),
    (">winners, 91%</p>", ">ganadoras, 91%</p>"),
    (">losers, 9%</p>", ">perdedoras, 9%</p>"),
    (
        'aria-label="Money won 7,814 dollars, money lost 2,228 dollars, costs 299 dollars"',
        'aria-label="Dinero ganado 7,814 dólares, dinero perdido 2,228 dólares, costos 299 dólares"',
    ),
    (">Money won vs. money lost</h3>", ">Dinero ganado vs. dinero perdido</h3>"),
    (">Won</span>", ">Ganado</span>"),
    (">Lost</span>", ">Perdido</span>"),
    (">Costs</span>", ">Costos</span>"),
    ('<div class="k">Average per trade</div>', '<div class="k">Promedio por operación</div>'),
    (">net, all 104 trades<", ">neto, las 104 operaciones<"),
    ('<div class="k">Best trade</div>', '<div class="k">Mejor operación</div>'),
    (">single trade<", ">una sola operación<"),
    ('<div class="k">Longest streaks</div>', '<div class="k">Rachas más largas</div>'),
    (">34 W / 2 L<", ">34 G / 2 P<"),
    (">in a row<", ">seguidas<"),
    ('<div class="k">System quality (SQN)</div>', '<div class="k">Calidad del sistema (SQN)</div>'),
    (">Van Tharp score<", ">puntaje de Van Tharp<"),
    (">The honest part: small wins, bigger losses</h3>", ">La parte honesta: ganancias chicas, pérdidas más grandes</h3>"),
    (">The average win was <b", ">La ganancia promedio fue <b"),
    ("</b>. The average loss was <b", "</b>. La pérdida promedio fue <b"),
    (
        "</b>. That is normal for a high win-rate style, but it means a few bad trades can erase many good ones. It is exactly why the Wipeout Meter and the safe lot size live inside the panel.",
        "</b>. Es normal en un estilo con alta tasa de acierto, pero significa que pocas operaciones malas pueden borrar muchas buenas. Justo por eso el Medidor de Quiebre y el lote seguro viven dentro del panel.",
    ),
    (">Average win</span>", ">Ganancia promedio</span>"),
    (">Average loss</span>", ">Pérdida promedio</span>"),
    (
        "Original performance report in Spanish: 104 closed trades, 91.3% win rate, profit factor 3.51, net 101,663.21 MXN",
        "Reporte de rendimiento original: 104 operaciones cerradas, 91.3% de acierto, factor de beneficio 3.51, neto 101,663.21 MXN",
    ),
    ("The original report, in Spanish. Account number hidden.", "El reporte original. Número de cuenta oculto."),
    (
        "Original results curve in Spanish, from July 30 to September 18, ending at 101,663.21 MXN",
        "Curva de resultados original, del 30 de julio al 18 de septiembre, cerrando en 101,663.21 MXN",
    ),
    ("The original results curve, in Mexican pesos.", "La curva de resultados original, en pesos mexicanos."),
    (
        "One account over seven weeks is a small sample. Past results do not guarantee future results. Your results depend on your own decisions, your broker, your position size and the market.",
        "Una cuenta durante siete semanas es una muestra pequeña. Los resultados pasados no garantizan resultados futuros. Tus resultados dependen de tus propias decisiones, tu bróker, el tamaño de tu posición y el mercado.",
    ),

    # ---------- idioma del panel ----------
    ("English by default. Spanish with one setting.</h2>", "En español o en inglés, con un solo ajuste.</h2>"),
    (
        "Every button, tooltip, alert and push notification switches language from the Language setting. The math, the signals and the alerts stay exactly the same.",
        "Cada botón, tooltip, alerta y notificación push cambia de idioma desde el ajuste Idioma. Los cálculos, las señales y las alertas siguen exactamente iguales.",
    ),
    (
        "On the left, a real MetaTrader 4 capture in Spanish. On the right, the same panel in English.",
        "A la izquierda, una captura real de MetaTrader 4 en español. A la derecha, el mismo panel en inglés.",
    ),
    ('<div class="inner" data-panel></div>', '<div class="inner" data-panel data-tpl="panelTplEn"></div>'),

    # ---------- pasos ----------
    ("Running on your chart in about five minutes.</h2>", "Funcionando en tu gráfico en unos cinco minutos.</h2>"),
    (
        '<span class="n">Step 1</span><h3>Message us</h3><p>Send us a WhatsApp. We answer your questions and send your copy of Legion AI with simple install steps.</p>',
        '<span class="n">Paso 1</span><h3>Escríbenos</h3><p>Mándanos un WhatsApp. Respondemos tus preguntas y te enviamos tu copia de Legion AI con pasos de instalación sencillos.</p>',
    ),
    (
        '<span class="n">Step 2</span><h3>Drop it on your chart</h3><p>Copy one file into MetaTrader 4 and drag it onto any chart. No extra software, no add-ons.</p>',
        '<span class="n">Paso 2</span><h3>Ponlo en tu gráfico</h3><p>Copia un archivo en MetaTrader 4 y arrástralo a cualquier gráfico. Sin programas extra ni complementos.</p>',
    ),
    (
        '<span class="n">Step 3</span><h3>Read, then decide</h3><p>Check the overall reading, look at your wipeout line, and make your call with the full picture in front of you.</p>',
        '<span class="n">Paso 3</span><h3>Lee y luego decide</h3><p>Revisa la lectura general, mira tu línea de quiebre y toma tu decisión con el panorama completo enfrente.</p>',
    ),

    # ---------- FAQ ----------
    ("Questions traders ask us</h2>", "Preguntas que nos hacen los traders</h2>"),
    (
        "<summary>Does Legion AI trade for me?</summary><p>No. It is an analysis panel. It reads the market and your account, but every trade is your decision. It never opens, changes or closes an order.</p>",
        "<summary>¿Legion AI opera por mí?</summary><p>No. Es un panel de análisis. Lee el mercado y tu cuenta, pero cada operación es decisión tuya. Nunca abre, modifica ni cierra una orden.</p>",
    ),
    (
        "<summary>Do I need experience?</summary><p>Basic MetaTrader 4 knowledge is enough. Every number has a tooltip that explains it in simple words, and the overall reading sums everything up in one sentence.</p>",
        "<summary>¿Necesito experiencia?</summary><p>Basta con saber lo básico de MetaTrader 4. Cada número tiene un tooltip que lo explica en palabras simples, y la lectura general lo resume todo en una frase.</p>",
    ),
    (
        "<summary>Which markets does it work on?</summary><p>Any symbol your MT4 broker offers: Gold, Bitcoin, S&amp;P 500, Nasdaq, US30, forex pairs and more. The Historical Drops tool includes crash history for Gold, Bitcoin, S&amp;P 500, Nasdaq and US30.</p>",
        "<summary>¿En qué mercados funciona?</summary><p>En cualquier símbolo que ofrezca tu bróker de MT4: Oro, Bitcoin, S&amp;P 500, Nasdaq, US30, pares de forex y más. La herramienta Caídas Históricas incluye el historial de desplomes de Oro, Bitcoin, S&amp;P 500, Nasdaq y US30.</p>",
    ),
    (
        "<summary>Will it work with my broker?</summary><p>If your broker gives you MetaTrader 4, yes. Legion AI runs inside MT4 and only uses the price data your platform already has.</p>",
        "<summary>¿Funciona con mi bróker?</summary><p>Si tu bróker te da MetaTrader 4, sí. Legion AI corre dentro de MT4 y solo usa los datos de precio que tu plataforma ya tiene.</p>",
    ),
    (
        "<summary>Does it run on my phone?</summary><p>The panel runs on MT4 for desktop (Windows, or a Mac or VPS that runs MT4). Your phone gets the alerts through MT4 push notifications.</p>",
        "<summary>¿Funciona en mi teléfono?</summary><p>El panel corre en MT4 de escritorio (Windows, o una Mac o VPS que corra MT4). Tu teléfono recibe las alertas con las notificaciones push de MT4.</p>",
    ),
    (
        "<summary>Can it guarantee profits?</summary><p>No tool can. Legion AI helps you see the market and your risk more clearly. Results always depend on your decisions, your position size and the market.</p>",
        "<summary>¿Puede garantizar ganancias?</summary><p>Ninguna herramienta puede. Legion AI te ayuda a ver con más claridad el mercado y tu riesgo. Los resultados siempre dependen de tus decisiones, del tamaño de tu posición y del mercado.</p>",
    ),
    (
        "<summary>Will it slow down MetaTrader?</summary><p>It only redraws what changed instead of repainting everything on every tick, so it stays light even with all fourteen tools on.</p>",
        "<summary>¿Hace más lento MetaTrader?</summary><p>Solo redibuja lo que cambió en lugar de repintar todo en cada tick, así se mantiene ligero incluso con las catorce herramientas encendidas.</p>",
    ),
    (
        "<summary>Is it in English?</summary><p>Yes. The whole panel, including tooltips, buttons and alerts, is in English by default, with Spanish as an option.</p>",
        "<summary>¿Está en español?</summary><p>Sí. Todo el panel, incluidos tooltips, botones y alertas, está en español y en inglés; se cambia con un solo ajuste.</p>",
    ),

    # ---------- cierre ----------
    ("Trade with the full picture, not a hunch.</h2>", "Opera con el panorama completo, no con una corazonada.</h2>"),
    (
        "Message us today. We will show you the panel live, answer your questions and help you install it.",
        "Escríbenos hoy. Te mostramos el panel en vivo, respondemos tus preguntas y te ayudamos a instalarlo.",
    ),
    (">Message us on WhatsApp</a>", ">Escríbenos por WhatsApp</a>"),
    (">Tour the panel again</a>", ">Ver el panel otra vez</a>"),

    # ---------- footer ----------
    ('aria-label="Back to top"', 'aria-label="Volver arriba"'),
    ("<h3>Risk disclosure</h3>", "<h3>Aviso de riesgo</h3>"),
    (
        "Trading foreign exchange, CFDs, metals, stock indices and cryptocurrencies on margin carries a high level of risk and may not be suitable for all investors. You could lose some or all of your money. Legion AI is an analysis tool for MetaTrader 4. It does not place, modify or close trades, does not manage money and does not provide personalized investment advice. Readings such as Buy bias, Sell bias and the confidence score measure agreement between technical tools; they are not predictions or guarantees.",
        "Operar divisas, CFD, metales, índices bursátiles y criptomonedas con margen conlleva un alto nivel de riesgo y puede no ser adecuado para todos los inversionistas. Podrías perder parte o la totalidad de tu dinero. Legion AI es una herramienta de análisis para MetaTrader 4. No abre, modifica ni cierra operaciones, no administra dinero y no brinda asesoría de inversión personalizada. Lecturas como Sesgo comprador, Sesgo vendedor y el puntaje de confianza miden el acuerdo entre herramientas técnicas; no son predicciones ni garantías.",
    ),
    (
        "The results on this page come from one live account traded manually by our team from July 30 to September 18, converted from Mexican pesos to US dollars at 18.20 MXN/USD. The equity curve between its start and end points is approximate. These results are not typical and are not a promise of what you will earn. Past performance is not indicative of future results. Panel images on this page are recreations of the software with sample values; campaign posters are artwork.",
        "Los resultados de esta página provienen de una cuenta real operada manualmente por nuestro equipo del 30 de julio al 18 de septiembre, convertidos de pesos mexicanos a dólares a 18.20 MXN/USD. La curva de capital entre su punto inicial y final es aproximada. Estos resultados no son típicos ni una promesa de lo que ganarás. El rendimiento pasado no es indicativo de resultados futuros. Las imágenes del panel en esta página son recreaciones del software con valores de muestra; los pósters de campaña son arte.",
    ),
    (
        "MetaTrader 4 is a trademark of its owner. Legion AI is not affiliated with MetaQuotes or with any broker.",
        "MetaTrader 4 es una marca registrada de su propietario. Legion AI no está afiliado a MetaQuotes ni a ningún bróker.",
    ),

    # ---------- panel recreado (plantilla) ----------
    ("MARKET DASHBOARD  /  XAUUSD  |  M15", "TABLERO DE MERCADO  /  XAUUSD  |  M15"),
    ('<div class="iaTop">AI: ', '<div class="iaTop">IA: '),
    (
        '<span class="on">SUMMARY</span><span>TOOLS</span><span>CANDLE ZOOM</span><span>WIPEOUT</span><span>DROPS</span>',
        '<span class="on">RESUMEN</span><span>HERRAMIENTAS</span><span>VELA ZOOM</span><span>QUIEBRE</span><span>CAIDAS</span>',
    ),
    ("<span>ACCOUNT AND POSITION</span>", "<span>CUENTA Y POSICION</span>"),
    ("<span>EQUITY</span>", "<span>EQUIDAD</span>"),
    ("<span>FLOATING</span>", "<span>FLOTANTE</span>"),
    ("<span>MARGIN LEVEL</span>", "<span>NIVEL MARGEN</span>"),
    (">UNUSED<", ">SIN USO<"),
    ("<span>POSITION</span>", "<span>POSICION</span>"),
    (">NO POSITION<", ">SIN POSICION<"),
    ("<span>SIZE USD</span>", "<span>TAMANO USD</span>"),
    ("<span>SIZE MXN</span>", "<span>TAMANO MXN</span>"),
    ("<span>LEVERAGE</span>", "<span>APALANCAMIENTO</span>"),
    (">WIPED OUT AT (STOP OUT)<", ">SE QUEMA EN (STOP OUT)<"),
    (">No trades on XAUUSD<", ">Sin operaciones en XAUUSD<"),
    (">CUSHION<", ">COLCHON<"),
    ("<span>AI STATUS</span>", "<span>ESTADO IA</span>"),
    ("OVERALL MARKET READING", "LECTURA GENERAL DEL MERCADO"),
    ('<div class="s">CONFIDENCE</div>', '<div class="s">CONFIANZA</div>'),
    ('<span style="color:#E5483F">SELL</span>', '<span style="color:#E5483F">VENTA</span>'),
    ('text-align:right">BUY</span>', 'text-align:right">COMPRA</span>'),
    ("<b>SCORE -43</b>", "<b>PUNTAJE -43</b>"),
    ("<i>BEAR+</i>", "<i>BAJ+</i>"),
    ("<i>BEAR</i>", "<i>BAJ</i>"),
    ("<i>BULL</i>", "<i>ALC</i>"),
    ('<div class="h">AI READING</div>', '<div class="h">LECTURA IA</div>'),
    (
        "&gt; RSI   STRONG BEARISH -83% | 6/6 BEAR | accelerating in favor",
        "&gt; RSI   BAJISTA FUERTE -83% | 6/6 BAJ | acelera a favor",
    ),
    (
        "&gt; ADX   high -46 sell | low -70 strong sell | no gun",
        "&gt; ADX   alto -46 venta | bajo -70 venta fuerte | sin pistola",
    ),
    (
        "&gt; FLOW  short +1 | medium -35 | long -84 | no consensus",
        "&gt; FLOW  corto +1 | medio -35 | largo -84 | sin consenso",
    ),
    ("&gt; PAIR  XAU 0.9 vs USD 9.0 (D1) | XAU 2.7 (M15x20) | dominates USD", "&gt; PAR  XAU 0.9 vs USD 9.0 (D1) | XAU 2.7 (M15x20) | domina USD"),
    ("&gt; STRUCT  2 bull / 1 bear | NOT SYNCED", "&gt; ESTR  2 alc / 1 baj | NO SINCRONIZADO"),
    (
        "&gt; CANDLE  no mother candle (key S + click or LAST CANDLE)",
        "&gt; VELA  sin vela madre (tecla S + clic o ULTIMA VELA)",
    ),
    ("&gt; VOL   RVOL 1.77x HIGH proj | NEW YORK", "&gt; VOL   RVOL 1.77x ALTO proy | NUEVA YORK"),
    ("&gt; VOTES for 4 | against 1 | neutral 0 of 5 | no gun", "&gt; VOTOS a favor 4 | en contra 1 | neutros 0 de 5 | sin pistola"),
    ('<span>BIAS</span><span class="rd">STRONG BEARISH</span>', '<span>SESGO</span><span class="rd">BAJISTA FUERTE</span>'),
    ('<span>STRENGTH</span><span class="rd">-83%  6/6 BEAR</span>', '<span>FUERZA</span><span class="rd">-83%  6/6 BAJ</span>'),
    ('<span>MOMENTUM</span><span class="rd">ACCEL  3 FALLING</span>', '<span>IMPULSO</span><span class="rd">ACELERA  3 BAJAN</span>'),
    ("<span>CLOSE</span><span>M1", "<span>CIERRE</span><span>M1"),
    ('<div class="noent">DO NOT ENTER</div>', '<div class="noent">NO ENTRES</div>'),
    ("MTF STRUCTURE  |  ATR IMPULSES", "ESTRUCTURA MTF  |  IMPULSOS ATR"),
    ('<span class="yl">MIXED 2/1</span>', '<span class="yl">MIXTO 2/1</span>'),
    (
        "<b>NOT SYNCED</b><br>Do not trade: 2 bull / 1 bear on W1 D1 H4",
        "<b>NO SINCRONIZADO</b><br>No operar: 2 alc / 1 baj en W1 D1 H4",
    ),
    ("<span>CURRENT</span>", "<span>ACTUAL</span>"),
    ('<span class="k1">SCREEN</span><span class="k2">STRUCT</span>', '<span class="k1">PANTALLA</span><span class="k2">ESTR</span>'),
    ('<span class="k3">SHOW</span><span class="k4">DRAWINGS</span>', '<span class="k3">MOSTRAR</span><span class="k4">DIBUJOS</span>'),
    ("<span>PAIR STRENGTH</span>", "<span>FUERZA DEL PAR</span>"),
    ("<span>ADX GUN MTF</span>", "<span>ADX PISTOLA MTF</span>"),
    (
        "KEYS  P fold  Z/X zoom  C cross  R rectangle<br>ON/OFF  E sessions  Y psy  O OB  F FVG  T structure  H drops  V candle zoom",
        "TECLAS  P plegar  Z/X zoom  C cruz  R rectangulo<br>ON/OFF  E sesiones  Y psy  O OB  F FVG  T estructura  H caidas  V vela zoom",
    ),
    ("<span>DOES NOT GUARANTEE RESULTS</span>", "<span>NO GARANTIZA RESULTADOS</span>"),

    # ---------- panel recreado (JS): español salvo la plantilla en inglés ----------
    (
        "var node = document.getElementById('panelTpl').content.cloneNode(true);",
        "var tplId = host.getAttribute('data-tpl') || 'panelTpl', en = tplId === 'panelTplEn';\n"
        "    var node = document.getElementById(tplId).content.cloneNode(true);",
    ),
    (
        "<th style=\"color:#C9CFD8\">CHG</th><th style=\"color:#C9CFD8\">STREAK</th></tr>'",
        "<th style=\"color:#C9CFD8\">'+(en?'CHG':'VAR')+'</th><th style=\"color:#C9CFD8\">'+(en?'STREAK':'RACHA')+'</th></tr>'",
    ),
    (
        "(r[1]==='b'?'BULLISH':'BEARISH')+'</span><span>'+r[2]+'</span><span>'+r[3]+'</span>",
        "(r[1]==='b'?(en?'BULLISH':'ALCISTA'):(en?'BEARISH':'BAJISTA'))+'</span><span>'+(en?r[2]:(STRUCT_ES[r[2]]||r[2]))+'</span><span>'+(en?r[3]:r[3].replace('below','bajo').replace('above','sobre'))+'</span>",
    ),
    ("var flow = [['8 D'", "var STRUCT_ES = {Correcting:'Corrigiendo', Impulsing:'Impulsando'};\n  var flow = [['8 D'"),
]
