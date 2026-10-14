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

El script copia el HTML a `source/`, extrae las imágenes base64 a `public/img/`, añade manifest,
iconos, metadatos sociales y el banner de instalación PWA, y genera `public/index.en.html` y
`public/index.es.html`. Después del push, Coolify redespliega.

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
