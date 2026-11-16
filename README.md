# Legion AI — SuperPanel MT4

Landing + cuenta Google OAuth + checkout Stripe **$350 USD** + descarga segura del `.ex4`.

- Producción: https://legionai.iareal.net
- Health: https://legionai.iareal.net/api/health
- Cuenta: `/cuenta` · Admin: `/admin`
- Coolify UUID: `xlpom9jg332j5jbnzutants7` · puerto `3043`

## Flujo

1. CTA de la landing → `/cuenta` → Google OAuth (cliente **Promptvalue**).
2. Checkout vía Payment Gateway n8n (`appId: legion-ai`, $350).
3. Descarga: token HMAC de un solo uso (60 s), sesión + compra, rate limit, auditoría.
4. El `.ex4` vive en `private/product/` (nunca en `public/`).

## Google OAuth

- Client ID: `1091222021847-ph8k6rbvkpkk9gf1j41v6hiiqje6vnlc.apps.googleusercontent.com`
- Redirect: `https://legionai.iareal.net/api/auth/callback/google`
- Console: https://console.cloud.google.com/auth/clients/ph8k6rbvkpkk9gf1j41v6hiiqje6vnlc?project=1091222021847

## Seguridad

Sesiones HMAC httpOnly; fail-closed sin secretos; Docker read_only + cap_drop ALL + no-new-privileges; CSP + HSTS; descarga sin URL permanente.
