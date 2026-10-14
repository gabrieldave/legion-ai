# Legion AI — landing estática endurecida
# Multi-stage · nginx alpine pinneado · no-root · imagen <300MB

FROM alpine:3.20 AS assets
ARG SOURCE_COMMIT=unknown
WORKDIR /src
COPY public/ ./public/
COPY nginx/ ./nginx/
RUN test -f public/index.html \
 && test -f public/manifest.webmanifest \
 && test -f public/pwa-banner.js \
 && test -f public/icons/icon-192.png \
 && test -f public/icons/icon-512.png \
 && test "$(wc -c < public/index.html)" -gt 10000 \
 && ! grep -q 'data:image/jpeg;base64' public/index.html \
 && sed -i "s/__GIT_COMMIT__/${SOURCE_COMMIT}/" nginx/default.conf \
 && find public -type f \( -name '*.html' -o -name '*.js' -o -name '*.svg' -o -name '*.webmanifest' -o -name '*.xml' -o -name '*.txt' \) \
      -exec gzip -9 -k {} \;

FROM nginx:1.27-alpine AS runner
RUN rm -f /etc/nginx/conf.d/default.conf \
 && chown -R nginx:nginx /var/cache/nginx

COPY --from=assets /src/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=assets /src/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=assets --chown=nginx:nginx /src/public/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

# Sin docker-entrypoint.sh: intenta escribir configuración y el FS es read_only.
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
