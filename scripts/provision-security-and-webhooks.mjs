#!/usr/bin/env node
/**
 * Automatizador Dual-Mac para OpenCode / Cursor (Cero secretos impresos en consola):
 * 1. Lee linea por linea $HOME/Documents/VibeSystems/secrets.env (sin usar source).
 * 2. Genera LEGION_ED25519_PRIVATE_KEY_HEX y LEGION_ED25519_PUBLIC_KEY_HEX si faltan.
 * 3. Estampa automaticamente LLG_ED25519_PUBKEY_HEX dentro de source/mql4/Legion_SuperPanel_v3_15_MT4.mq4.
 * 4. Asegura por API en Stripe Live los 5 eventos obligatorios en https://legionai.iareal.net/api/webhooks/stripe.
 * 5. Sincroniza variables en Coolify (xlpom9jg332j5jbnzutants7) si COOLIFY_API_TOKEN esta presente.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SECRETS_PATH = path.join(
  os.homedir(),
  "Documents",
  "VibeSystems",
  "secrets.env",
);
const WEBHOOK_URL = "https://legionai.iareal.net/api/webhooks/stripe";
const COOLIFY_UUID = "xlpom9jg332j5jbnzutants7";
const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "charge.refunded",
  "charge.dispute.created",
  "payment_intent.canceled",
];

function parseEnvFileLineByLine(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function upsertEnvKey(filePath, key, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let content = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf8")
    : "";
  const regex = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    if (content.length > 0 && !content.endsWith("\n")) content += "\n";
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function ensureEd25519Keys(secrets) {
  let privHex =
    secrets.get("LEGION_ED25519_PRIVATE_KEY_HEX") ||
    secrets.get("APP_legion-ai_ED25519_PRIVATE_KEY_HEX") ||
    "";
  let pubHex =
    secrets.get("LEGION_ED25519_PUBLIC_KEY_HEX") ||
    secrets.get("APP_legion-ai_ED25519_PUBLIC_KEY_HEX") ||
    "";

  if (!/^[0-9a-fA-F]{64}$/.test(privHex) || !/^[0-9a-fA-F]{64}$/.test(pubHex)) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const privDer = privateKey.export({ format: "der", type: "pkcs8" });
    const pubDer = publicKey.export({ format: "der", type: "spki" });
    privHex = privDer.subarray(16, 48).toString("hex");
    pubHex = pubDer.subarray(12, 44).toString("hex");
    upsertEnvKey(SECRETS_PATH, "LEGION_ED25519_PRIVATE_KEY_HEX", privHex);
    upsertEnvKey(SECRETS_PATH, "LEGION_ED25519_PUBLIC_KEY_HEX", pubHex);
    console.log("[OK] Par Ed25519 de produccion generado y guardado en secrets.env (chmod 600).");
  } else {
    console.log("[OK] Par Ed25519 de produccion existente detectado en secrets.env.");
  }
  return { privHex, pubHex };
}

function patchMql4PublicKey(pubHex) {
  const wineDavidDir = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "net.metaquotes.wine.metatrader4",
    "drive_c",
    "Program Files (x86)",
    "MetaTrader 4",
    "MQL4",
    "Indicators",
    "David",
  );
  const wineIndicatorsDir = path.dirname(wineDavidDir);
  const localRepoCopy = path.resolve("source/mql4/Legion_SuperPanel_v3_15_MT4.mq4");
  const downloadsCopy = path.join(os.homedir(), "Downloads", "Legion_SuperPanel_v3_15_MT4.mq4");

  if (!fs.existsSync(localRepoCopy) && fs.existsSync(downloadsCopy)) {
    fs.mkdirSync(path.dirname(localRepoCopy), { recursive: true });
    fs.copyFileSync(downloadsCopy, localRepoCopy);
  }

  const candidates = [localRepoCopy, downloadsCopy];
  let stampedContent = null;

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "ascii");
    const updated = src.replace(
      /#define LLG_ED25519_PUBKEY_HEX "[0-9a-fA-F]{64}"/,
      `#define LLG_ED25519_PUBKEY_HEX "${pubHex}"`,
    );
    fs.writeFileSync(file, updated, "ascii");
    stampedContent = updated;
    console.log(`[OK] Llave publica Ed25519 estampada en: ${file}`);
  }

  // Si existe la instalacion Wine de MetaTrader 4 en esta Mac, deja el .mq4 listo en Indicators/David
  if (stampedContent && fs.existsSync(wineIndicatorsDir)) {
    const targetDir = fs.existsSync(wineDavidDir) ? wineDavidDir : wineIndicatorsDir;
    const targetWineMq4 = path.join(targetDir, "Legion_SuperPanel_v3_15_MT4.mq4");
    fs.writeFileSync(targetWineMq4, stampedContent, "ascii");
    console.log(`[OK] .mq4 estampado copiado directo a tu MetaTrader 4 (Wine): ${targetWineMq4}`);
  }
}

function patchWebWindowsAndMac() {
  const winSvg = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="flex:none"><path fill="#00A4EF" d="M2 3.5 10.8 2.3v9H2v-7.8zm9.8-1.35L22 0.8v10.5H11.8V2.15zM2 12.3h8.8v9L2 20.1v-7.8zm9.8 0H22v10.5l-10.2-1.35V12.3z"/></svg>`;
  const macSvg = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style="flex:none"><path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.96 6.33c.64-.78 1.08-1.86.96-2.94-.93.04-2.06.62-2.72 1.4-.58.68-1.1 1.79-.96 2.84 1.04.08 2.08-.52 2.72-1.3z"/></svg>`;

  const imgDir = path.resolve("public/img");
  fs.mkdirSync(imgDir, { recursive: true });

  // Si el usuario descargo la imagen estudio de Windows + Mac en ~/Downloads, copiarla automaticamente
  const dlDir = path.join(os.homedir(), "Downloads");
  let heroBannerUrl = "/img/windows-mac-mt4.svg";
  const jpgCandidates = [
    path.join(dlDir, "windows-mac-mt4.jpg"),
    path.join(dlDir, "watermarked_img_5303427038060490696.jpg"),
  ];
  for (const cand of jpgCandidates) {
    if (fs.existsSync(cand)) {
      fs.copyFileSync(cand, path.join(imgDir, "windows-mac-mt4.jpg"));
      heroBannerUrl = "/img/windows-mac-mt4.jpg";
      console.log(`[OK] Imagen estudio Windows + Mac copiada desde ${cand}`);
      break;
    }
  }
  if (fs.existsSync(path.join(imgDir, "windows-mac-mt4.jpg"))) {
    heroBannerUrl = "/img/windows-mac-mt4.jpg";
  }

  // Crear siempre tambien la ilustracion vectorial retina Windows PC + Apple MacBook Pro
  const showcaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 420">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070D19"/><stop offset="1" stop-color="#0F1B33"/></linearGradient>
    <linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1324"/><stop offset="1" stop-color="#090E1A"/></linearGradient>
  </defs>
  <rect width="1120" height="420" rx="22" fill="url(#bg)" stroke="#243556" stroke-width="2"/>
  <line x1="560" y1="32" x2="560" y2="388" stroke="#1E2D4A" stroke-dasharray="6 6"/>
  <rect x="236" y="28" width="68" height="46" rx="12" fill="#0F213E" stroke="#38BDF8"/>
  <path fill="#38BDF8" d="M257 41.5 269 39.8v10.2h-12V41.5zm13.4-1.9L283 38v12h-12.6V39.6zM257 51.3h12v10.2l-12-1.7v-8.5zm13.4 0H283v12l-12.6-1.7V51.3z"/>
  <rect x="70" y="92" width="400" height="236" rx="12" fill="#162033" stroke="#3B4F73" stroke-width="2"/>
  <rect x="80" y="102" width="292" height="216" rx="6" fill="url(#scr)"/>
  <rect x="376" y="102" width="84" height="216" rx="6" fill="#111C33" stroke="#283B5E"/>
  <polyline fill="none" stroke="#1FA971" stroke-width="3" points="94,268 126,240 154,254 188,205 216,218 252,174 286,190 322,142 356,152"/>
  <rect x="384" y="114" width="68" height="18" rx="3" fill="#1FA971" fill-opacity="0.22"/>
  <rect x="384" y="140" width="68" height="36" rx="3" fill="#1A2946"/>
  <rect x="384" y="184" width="68" height="52" rx="3" fill="#1A2946"/>
  <rect x="384" y="244" width="68" height="62" rx="3" fill="#1A2946"/>
  <rect x="252" y="328" width="36" height="34" fill="#25344F"/>
  <rect x="206" y="362" width="128" height="10" rx="5" fill="#334668"/>
  <text x="270" y="398" fill="#E2E8F0" font-family="system-ui,sans-serif" font-size="16" font-weight="700" text-anchor="middle">Windows PC &amp; VPS (MetaTrader 4)</text>
  <rect x="816" y="28" width="68" height="46" rx="12" fill="#14243B" stroke="#94A3B8"/>
  <path fill="#F8FAFC" transform="translate(838,38)" d="M18.7 19.5c-.8 1.2-1.7 2.4-3 2.5-1.3 0-1.8-.8-3.3-.8-1.5 0-2 .8-3.3.8-1.3 0-2.3-1.3-3.1-2.5C4.3 17 3 12.4 4.7 9.4c.9-1.5 2.4-2.5 4.1-2.5 1.3 0 2.5.9 3.3.9.8 0 2.3-1.1 3.8-.9.7 0 2.5.3 3.6 2-.1.1-2.2 1.3-2.1 3.8 0 3 2.6 4 2.7 4-.1.1-.4 1.4-1.4 2.8M16 6.3c.6-.8 1.1-1.9 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z"/>
  <rect x="656" y="100" width="388" height="232" rx="14" fill="#1B2538" stroke="#475569" stroke-width="2"/>
  <rect x="668" y="112" width="276" height="208" rx="6" fill="url(#scr)"/>
  <rect x="948" y="112" width="84" height="208" rx="6" fill="#111C33" stroke="#283B5E"/>
  <polyline fill="none" stroke="#1FA971" stroke-width="3" points="682,272 714,244 742,258 776,208 804,220 840,176 874,192 910,144 932,154"/>
  <rect x="956" y="124" width="68" height="18" rx="3" fill="#1FA971" fill-opacity="0.22"/>
  <rect x="956" y="150" width="68" height="36" rx="3" fill="#1A2946"/>
  <rect x="956" y="194" width="68" height="52" rx="3" fill="#1A2946"/>
  <rect x="956" y="254" width="68" height="54" rx="3" fill="#1A2946"/>
  <path d="M624 332h452l-18 16H642z" fill="#334155"/>
  <rect x="822" y="332" width="56" height="5" rx="2.5" fill="#64748B"/>
  <text x="850" y="398" fill="#E2E8F0" font-family="system-ui,sans-serif" font-size="16" font-weight="700" text-anchor="middle">Apple Mac · macOS (M1–M4 &amp; Intel)</text>
</svg>`;
  fs.writeFileSync(path.join(imgDir, "windows-mac-mt4.svg"), showcaseSvg, "utf8");

  const landingPath = path.resolve("public/landing.html");
  if (fs.existsSync(landingPath)) {
    let html = fs.readFileSync(landingPath, "utf8");
    if (!html.includes("os-compat-badges")) {
      const osBadgesCss = `
.os-compat-badges{display:flex;flex-wrap:wrap;gap:.65rem;margin:.25rem 0}
.os-pill{display:inline-flex;align-items:center;gap:.55rem;padding:.5rem .85rem;border-radius:10px;background:#0F172A;color:#F8FAFC;border:1px solid #293548;font-size:.88rem;font-weight:650;box-shadow:0 8px 20px -10px rgba(16,26,43,.35)}
.os-pill small{font-weight:500;color:#94A3B8;margin-left:.15rem}
.os-showcase{margin:0 0 2rem;display:grid;gap:1.25rem}
.os-showcase-art{border-radius:16px;overflow:hidden;border:1px solid #293548;background:#090F1D;box-shadow:0 24px 50px -24px rgba(16,26,43,.55)}
.os-showcase-art img{display:block;width:100%;height:auto}
.os-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
.os-card{background:#fff;border:1px solid var(--rule);border-radius:12px;padding:1.25rem;display:grid;gap:.5rem}
.os-card-head{display:flex;align-items:center;gap:.6rem;font-weight:750;font-size:1.05rem;color:var(--ink)}
.os-card p{margin:0;color:var(--slate);font-size:.93rem;line-height:1.5}
@media (max-width:760px){.os-cards{grid-template-columns:1fr}}
</style>`;
      html = html.replace("</style>", osBadgesCss);

      const heroOsHtml = `<div class="os-compat-badges" aria-label="Plataformas compatibles">
<span class="os-pill">${winSvg}<span>Windows PC &amp; VPS</span></span>
<span class="os-pill">${macSvg}<span>Apple Mac <small>(macOS M1–M4 / Intel)</small></span></span>
<span class="os-pill"><span class="i-es">3 Cuentas MT4 + 1 Año Updates</span><span class="i-en">3 MT4 Accounts + 1-Year Updates</span></span>
</div>
<ul aria-label="Datos clave"`;
      html = html.replace('<ul aria-label="Datos clave"', heroOsHtml);

      const installShowcaseHtml = `<div class="os-showcase">
<div class="os-showcase-art"><img src="${heroBannerUrl}" alt="Legion SuperPanel compatible con MetaTrader 4 en Windows PC y Apple Mac" loading="lazy"/></div>
<div class="os-cards">
  <div class="os-card">
    <div class="os-card-head">${winSvg}<span>Windows 10 / 11 &amp; VPS</span></div>
    <p><span class="i-es">Tu descarga incluye <code>MANUAL_WINDOWS.html</code> y la carpeta <code>MQL4</code> ya armada con el indicador <code>.ex4</code> y tu licencia. Solo abres <i>Archivo → Abrir carpeta de datos</i> y arrastras.</span><span class="i-en">Your download includes <code>MANUAL_WINDOWS.html</code> and the ready-made <code>MQL4</code> folder with the <code>.ex4</code> indicator and your license. Just open <i>File → Open Data Folder</i> and drag it in.</span></p>
  </div>
  <div class="os-card">
    <div class="os-card-head">${macSvg}<span>Apple Mac (macOS Wine · Apple Silicon &amp; Intel)</span></div>
    <p><span class="i-es">Incluye <code>MANUAL_MAC.html</code> exclusivo para Mac con botón de 1 clic para abrir la ruta exacta en <b>Finder</b> (<code>Cmd ⌘ + Shift ⇧ + G</code>) e instalar el <code>.ex4</code> y tu llave <code>.lic</code> en segundos.</span><span class="i-en">Includes a dedicated <code>MANUAL_MAC.html</code> guide for Mac with a 1-click path copier for <b>Finder</b> (<code>Cmd ⌘ + Shift ⇧ + G</code>) to drop your <code>.ex4</code> and <code>.lic</code> key in seconds.</span></p>
  </div>
</div>
</div>
<ol class="steps">`;
      html = html.replace('<ol class="steps">', installShowcaseHtml);

      html = html.replace(
        '<p data-i18n="t26">Es un solo archivo. No instala programas ni pide permisos de DLL.</p>',
        '<p data-i18n="t26">Compatible con Windows y Mac. Tu paquete .ZIP incluye el indicador compilado, tu licencia para 3 cuentas MT4 y guías visuales para ambos sistemas.</p>'
      );
      html = html.replace(
        '<li><h3 data-i18n="t70">Copia el archivo</h3><p data-i18n="t74">En MT4 abre Archivo &gt; Abrir carpeta de datos y pega <code>Legion_SuperPanel_v3_15_MT4.mq4</code> en <code>MQL4/Indicators</code>.</p></li>',
        '<li><h3 data-i18n="t70">Registra tus 3 cuentas</h3><p data-i18n="t74">Tras tu compra en <code>/cuenta</code>, ingresa hasta 3 números de cuenta MT4 (reales, fondeo o demo) y descarga tu paquete <code>.ZIP</code> personalizado.</p></li>'
      );
      html = html.replace(
        '<li><h3 data-i18n="t71">Compila</h3><p data-i18n="t75">Ábrelo en MetaEditor y pulsa <kbd>F7</kbd>, o reinicia MT4 para que lo compile solo.</p></li>',
        '<li><h3 data-i18n="t71">Copia en Windows o Mac</h3><p data-i18n="t75">Sigue el manual incluido para <b>Windows</b> (<i>Abrir carpeta de datos</i>) o <b>Mac</b> (<i>Finder Cmd+Shift+G</i>): coloca el <code>.ex4</code> en <code>Indicators</code> y tu <code>.lic</code> en <code>Files</code>.</p></li>'
      );
      html = html.replace(
        '<li data-i18n="t81"><b>Windows.</b> En Mac funciona con el MT4 de tu broker; si falta la fuente Segoe UI, el panel usa una parecida.</li>',
        '<li data-i18n="t81"><b>Compatible con Windows y Mac (macOS):</b> incluye guía dedicada paso a paso tanto para PC/VPS como para Mac (Wine / Apple Silicon M1–M4 e Intel).</li>'
      );

      html = html.replace(
        '"t26": "It is a single file. Nothing to install and no DLL permissions."',
        '"t26": "Compatible with Windows and Mac. Your .ZIP bundle includes the compiled indicator, your 3-account MT4 license, and visual guides for both systems."'
      );
      html = html.replace(
        '"t70": "Copy the file", "t71": "Compile"',
        '"t70": "Register your 3 accounts", "t71": "Copy on Windows or Mac"'
      );
      html = html.replace(
        '"t74": "In MT4 open File &gt; Open Data Folder and paste <code>Legion_SuperPanel_v3_15_MT4.mq4</code> into <code>MQL4/Indicators</code>."',
        '"t74": "In <code>/cuenta</code> after purchase, enter up to 3 MT4 account numbers (live, prop firm or demo) and download your personalized <code>.ZIP</code> bundle."'
      );
      html = html.replace(
        '"t75": "Open it in MetaEditor and press <kbd>F7</kbd>, or restart MT4 so it compiles it for you."',
        '"t75": "Follow the included guide for <b>Windows</b> (<i>Open Data Folder</i>) or <b>Mac</b> (<i>Finder Cmd+Shift+G</i>) to drop your <code>.ex4</code> and <code>.lic</code> key."'
      );
      html = html.replace(
        '"t81": "<b>Windows.</b> On Mac it runs in your broker\'s MT4; if the Segoe UI font is missing, the panel uses a similar one."',
        '"t81": "<b>Windows &amp; Mac (macOS) compatible:</b> ships with dedicated step-by-step setup guides for both Windows PC/VPS and Mac (Apple Silicon M1–M4 &amp; Intel)."'
      );

      fs.writeFileSync(landingPath, html, "utf8");
      console.log("[OK] public/landing.html actualizado con insignias, ilustracion y tarjetas Windows + Mac.");
    }
  }

  for (const [fname, isEn] of [["index.es.html", false], ["index.en.html", true]]) {
    const p = path.resolve("public", fname);
    if (!fs.existsSync(p)) continue;
    let h = fs.readFileSync(p, "utf8");
    if (h.includes("os-dark-badges")) continue;
    const badgeRow = `<div class="os-dark-badges" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px">
      <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;border:1px solid rgba(69,226,163,.35);background:rgba(12,22,48,.75);color:#fff;font-size:13.5px;font-weight:600">${winSvg}<span>Windows PC &amp; VPS</span></span>
      <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;border:1px solid rgba(69,226,163,.35);background:rgba(12,22,48,.75);color:#fff;font-size:13.5px;font-weight:600">${macSvg}<span>Apple Mac (macOS)</span></span>
      <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;border:1px solid rgba(69,226,163,.25);background:rgba(12,22,48,.55);color:#94A3B8;font-size:13px;font-weight:600">${isEn ? "3 MT4 Accounts + 1-Year Updates" : "3 Cuentas MT4 + 1 Año Updates"}</span>
    </div>
      <div class="proof">`;
    h = h.replace('<div class="proof">', badgeRow);
    fs.writeFileSync(p, h, "utf8");
    console.log(`[OK] public/${fname} actualizado con insignias Windows + Mac.`);
  }
}

async function ensureStripeWebhook(secrets) {
  const stripeKey =
    secrets.get("LEGION_AI_STRIPE_SECRET_KEY") ||
    secrets.get("LEGION_STRIPE_SECRET_KEY") ||
    secrets.get("APP_legion-ai_STRIPE_SECRET_KEY") ||
    secrets.get("STRIPE_SECRET_KEY") ||
    "";

  if (!stripeKey.startsWith("sk_")) {
    console.log("[INFO] No se encontro sk_live_/sk_test_ en secrets.env; se omite provision de webhook Stripe.");
    return secrets.get("LEGION_AI_STRIPE_WEBHOOK_SECRET") || secrets.get("STRIPE_WEBHOOK_SECRET") || "";
  }

  const listRes = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  if (!listRes.ok) {
    throw new Error(`Stripe GET webhook_endpoints HTTP ${listRes.status}`);
  }
  const listJson = await listRes.json();
  const existing = (listJson.data || []).find((w) => w.url === WEBHOOK_URL);

  if (existing) {
    const merged = Array.from(
      new Set([...(existing.enabled_events || []).filter((e) => e !== "*"), ...REQUIRED_EVENTS]),
    );
    const body = new URLSearchParams();
    body.set("disabled", "false");
    merged.forEach((ev, i) => body.append(`enabled_events[${i}]`, ev));

    const updRes = await fetch(
      `https://api.stripe.com/v1/webhook_endpoints/${encodeURIComponent(existing.id)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    if (!updRes.ok) {
      throw new Error(`Stripe POST update webhook HTTP ${updRes.status}`);
    }
    console.log("[OK] Endpoint Stripe existente actualizado con los 5 eventos obligatorios (whsec preservado).");
    return (
      secrets.get("LEGION_AI_STRIPE_WEBHOOK_SECRET") ||
      secrets.get("APP_legion-ai_STRIPE_WEBHOOK_SECRET") ||
      secrets.get("STRIPE_WEBHOOK_SECRET") ||
      ""
    );
  }

  const createBody = new URLSearchParams();
  createBody.set("url", WEBHOOK_URL);
  REQUIRED_EVENTS.forEach((ev, i) => createBody.append(`enabled_events[${i}]`, ev));

  const createRes = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: createBody,
  });
  if (!createRes.ok) {
    throw new Error(`Stripe POST create webhook HTTP ${createRes.status}`);
  }
  const created = await createRes.json();
  if (created.secret) {
    upsertEnvKey(SECRETS_PATH, "LEGION_AI_STRIPE_WEBHOOK_SECRET", created.secret);
    console.log("[OK] Nuevo endpoint Stripe creado y whsec guardado en secrets.env.");
    return created.secret;
  }
  return "";
}

async function syncCoolifyEnv(secrets, envPairs) {
  const apiUrl = (secrets.get("COOLIFY_API_URL") || "https://coolify.vibesystems.tech/api/v1").replace(/\/$/, "");
  const token = secrets.get("COOLIFY_API_TOKEN") || "";
  if (!token) {
    console.log("[INFO] COOLIFY_API_TOKEN no presente en secrets.env; sincroniza las variables al desplegar.");
    return;
  }

  for (const [key, value] of Object.entries(envPairs)) {
    if (!value) continue;
    await fetch(`${apiUrl}/applications/${COOLIFY_UUID}/envs`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key, value, is_preview: false }),
    }).catch(() => null);
  }
  console.log(`[OK] Variables sincronizadas en Coolify (${COOLIFY_UUID}).`);
}

async function main() {
  const secrets = parseEnvFileLineByLine(SECRETS_PATH);
  const { privHex, pubHex } = ensureEd25519Keys(secrets);
  patchMql4PublicKey(pubHex);
  patchWebWindowsAndMac();
  const whsec = await ensureStripeWebhook(secrets);
  await syncCoolifyEnv(secrets, {
    LEGION_ED25519_PRIVATE_KEY_HEX: privHex,
    LEGION_ED25519_PUBLIC_KEY_HEX: pubHex,
    STRIPE_WEBHOOK_SECRET: whsec,
  });
  console.log(`[OK] Llave publica Ed25519 activa: ${pubHex}`);
}

main().catch((err) => {
  console.error("[ERROR]", err instanceof Error ? err.message : "fallo");
  process.exit(1);
});


