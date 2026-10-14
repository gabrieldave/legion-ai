#!/usr/bin/env sh
# Verifica la detección de idioma de nginx (cookie > país > Accept-Language > es).
# Uso: tests/i18n-detect.sh [BASE_URL]   (por defecto http://127.0.0.1:3043)
# Contra la URL pública, Cloudflare reemplaza CF-IPCountry con el país real del cliente.
BASE="${1:-http://127.0.0.1:3043}"
fail=0

check() {
  expected="$1"; name="$2"; shift 2
  got=$(curl -s -o /dev/null -D - "$@" "$BASE/" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-language"{print $2}')
  if [ "$got" = "$expected" ]; then
    echo "ok   $name -> $got"
  else
    echo "FAIL $name -> esperado $expected, obtuvo '${got}'"; fail=1
  fi
}

check es "sin señales"
check en "país US" -H "CF-IPCountry: US"
check en "país GB gana a navegador es" -H "CF-IPCountry: GB" -H "Accept-Language: es-MX,es;q=0.9"
check es "país MX gana a navegador en" -H "CF-IPCountry: MX" -H "Accept-Language: en-US,en;q=0.9"
check es "país desconocido XX" -H "CF-IPCountry: XX" -H "Accept-Language: en-US"
check en "sin país, navegador en-US" -H "Accept-Language: en-US,en;q=0.9"
check es "sin país, navegador es-MX" -H "Accept-Language: es-MX,es;q=0.9,en;q=0.8"
check en "sin país, primer tag usable en" -H "Accept-Language: fr-FR,fr;q=0.9,en;q=0.8"
check es "sin país, navegador sin es/en" -H "Accept-Language: de-DE,fr;q=0.9"
check es "cookie es gana a país US" -H "Cookie: legion-ai-lang=es" -H "CF-IPCountry: US"
check en "cookie en gana a país MX" -H "Cookie: other=1; legion-ai-lang=en" -H "CF-IPCountry: MX"
check en "cookie inválida se ignora" -H "Cookie: legion-ai-lang=fr" -H "CF-IPCountry: US"
check es "cookie de otra app no cuenta" -H "Cookie: atlas-lang=en"

exit $fail
