# Legion AI — landing

Página comercial de Legion AI, el panel inteligente de análisis de mercados para MetaTrader 4.

- Producción: https://legionai.iareal.net
- Healthcheck: https://legionai.iareal.net/api/health
- Coolify: build pack Docker Compose, puerto host `3043` → contenedor `8080` (nginx no-root)

## Actualizar la página

El diseño original vive en la carpeta de indicadores de MT4. Para publicar una nueva versión:

```bash
python3 scripts/build.py "/Users/daveax/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Indicators/David/Legion_AI_Premium_Page.html"
git add -A && git commit -m "Actualiza landing" && git push
```

El script copia el HTML a `source/`, extrae las imágenes base64 a `public/img/`, añade manifest,
iconos, metadatos sociales y el banner de instalación PWA, y deja todo listo en `public/`.
Después del push, Coolify redespliega.
