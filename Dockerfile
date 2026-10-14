# Legion AI — landing estática bilingüe (es/en) endurecida
# Multi-stage · nginx alpine pinneado · no-root · imagen <300MB

FROM alpine:3.24 AS assets
ARG SOURCE_COMMIT=unknown
WORKDIR /src
COPY public/ ./public/
COPY nginx/ ./nginx/
RUN for f in index.es.html index.en.html manifest.webmanifest pwa-banner.js i18n.js icons/icon-192.png icons/icon-512.png; do \
      test -f "public/$f" || { echo "falta public/$f"; exit 1; }; \
    done \
 && test "$(wc -c < public/index.es.html)" -gt 10000 \
 && test "$(wc -c < public/index.en.html)" -gt 10000 \
 && grep -q '<html lang="es">' public/index.es.html \
 && grep -q '<html lang="en">' public/index.en.html \
 && ! grep -q 'data:image/jpeg;base64' public/index.es.html public/index.en.html \
 && sed -i "s/__GIT_COMMIT__/${SOURCE_COMMIT}/" nginx/default.conf \
 && find public -type f \( -name '*.html' -o -name '*.js' -o -name '*.svg' -o -name '*.webmanifest' -o -name '*.xml' -o -name '*.txt' \) \
      -exec gzip -9 -k {} \;

FROM nginx:1.30.6-alpine AS runner
RUN rm -f /etc/nginx/conf.d/default.conf \
 && mkdir -p /etc/nginx/snippets \
 && chown -R nginx:nginx /var/cache/nginx

COPY --from=assets /src/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=assets /src/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=assets /src/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=assets --chown=nginx:nginx /src/public/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

# Sin docker-entrypoint.sh: intenta escribir configuración y el FS es read_only.
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
