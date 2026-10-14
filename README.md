# Legion AI — landing

Página comercial de Legion AI, el panel inteligente de análisis de mercados para MetaTrader 4.

- Producción: https://legionai.iareal.net
- Healthcheck: https://legionai.iareal.net/api/health
- Coolify: build pack Docker Compose, puerto host `3043` → contenedor `8080` (nginx no-root)

## Actualizar la página

El diseño original (en inglés) vive en la carpeta de indicadores de MT4. Para publicar una nueva versión:

```bash
python3 scripts/build.py "/Users/daveax/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Indicators/David/Legion_AI_Premium_Page.html"
git add -A && git commit -m "Actualiza landing" && git push
```

El script copia el HTML a `source/`, extrae las imágenes base64 a `public/img/`, añade iconos,
metadatos sociales y el selector de idioma, y genera `public/index.en.html` y
`public/index.es.html`. La landing no es instalable como app (sin manifest ni banner PWA).

La sección «Cada pestaña, tal como se ve en tu MT4» usa las capturas de `source/scanner/` y los
textos bilingües de `i18n/scanner.py`. Para cambiar una captura, reemplaza el archivo (mismo
nombre) y vuelve a correr el build. Las capturas con el panel en inglés van en
`source/scanner/en/` con el mismo nombre; las que falten se muestran en español.

En resultados, las capturas inclinadas del original se sustituyen por la captura plana de
Analytics MT4 (`source/results/analytics-resumen.jpg`, sin menú lateral y con el número de cuenta
oculto) y las cifras en pesos de `i18n/results.py`. Analytics MT4 solo existe en español, así que la
versión en inglés usa una recreación (`source/results/analytics-en.html`); si cambias cifras ahí,
vuelve a generar la imagen con `scripts/render-analytics-en.sh`. Después del push, Coolify redespliega.

## Idiomas (§12.10)

Español por defecto; inglés solo por elección o por país. Una sola URL (`/`), sin rutas `/en`.
nginx elige `index.es.html` o `index.en.html` con esta prioridad:

1. Cookie `legion-ai-lang` (`es` / `en`), que escribe el selector ES | EN del header.
2. País de Cloudflare (`CF-IPCountry`): países angloparlantes → inglés; cualquier otro → español.
3. Primer idioma `es`/`en` de `Accept-Language` (solo si no hay país).
4. Español.

La traducción vive en `i18n/es.py` como pares (texto en inglés, texto en español). Si cambias el
HTML original y un texto en inglés ya no existe, el build falla y lista los pares que hay que
actualizar. Los términos del panel siguen el diccionario `TR_Add` del indicador MQL4.

Para probar la detección contra un contenedor local o el VPS:

```bash
tests/i18n-detect.sh http://127.0.0.1:3043
```
