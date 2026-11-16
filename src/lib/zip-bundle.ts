import { readFile } from "fs/promises";
import { LICENSE_FILENAME } from "@/lib/access";

export const MAC_WINE_MQL4_PATH =
  "~/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4";

export const MAC_WINE_INDICATORS_PATH = `${MAC_WINE_MQL4_PATH}/Indicators`;
export const MAC_WINE_FILES_PATH = `${MAC_WINE_MQL4_PATH}/Files`;

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function buildZipStore(
  entries: Array<{ name: string; data: Buffer | string }>,
): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const dataBuf = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data, "utf8");
    const crc = crc32(dataBuf);

    const localHdr = Buffer.alloc(30);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0x0800, 6);
    localHdr.writeUInt16LE(0, 8);
    localHdr.writeUInt16LE(0, 10);
    localHdr.writeUInt16LE(0x5770, 12);
    localHdr.writeUInt32LE(crc, 14);
    localHdr.writeUInt32LE(dataBuf.length, 18);
    localHdr.writeUInt32LE(dataBuf.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);
    localParts.push(localHdr, nameBuf, dataBuf);

    const centHdr = Buffer.alloc(46);
    centHdr.writeUInt32LE(0x02014b50, 0);
    centHdr.writeUInt16LE(20, 4);
    centHdr.writeUInt16LE(20, 6);
    centHdr.writeUInt16LE(0x0800, 8);
    centHdr.writeUInt16LE(0, 10);
    centHdr.writeUInt16LE(0, 12);
    centHdr.writeUInt16LE(0x5770, 14);
    centHdr.writeUInt32LE(crc, 16);
    centHdr.writeUInt32LE(dataBuf.length, 20);
    centHdr.writeUInt32LE(dataBuf.length, 24);
    centHdr.writeUInt16LE(nameBuf.length, 28);
    centHdr.writeUInt32LE(offset, 42);
    centralParts.push(centHdr, nameBuf);
    offset += 30 + nameBuf.length + dataBuf.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SHARED_STYLES = `
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b1120;color:#f8fafc;max-width:800px;margin:2rem auto;padding:0 1.25rem;line-height:1.6}
  .card{background:#111c33;border:1px solid #243556;border-radius:14px;padding:1.4rem;margin-bottom:1.2rem}
  h1{margin-top:0;color:#38bdf8;font-size:1.45rem}
  h2{margin-top:0;color:#34d399;font-size:1.12rem}
  code,pre{background:#080d1a;color:#7dd3fc;padding:0.2rem 0.45rem;border-radius:6px;font-family:Consolas,Menlo,monospace}
  pre{padding:0.85rem;overflow-x:auto;border:1px solid #1e293b;margin:0.55rem 0}
  li{margin-bottom:0.7rem}
  .muted{color:#94a3b8;font-size:0.92rem}
  .warn{background:#2c1618;border:1px solid #ef4444;color:#fecaca;padding:0.75rem 1rem;border-radius:10px;font-size:0.9rem;margin:0.75rem 0}
  button{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:0.55rem 0.95rem;font-weight:600;cursor:pointer;font-size:0.88rem}
  button:hover{background:#1d4ed8}
`;

export function buildWindowsManualHtml(input: {
  version: string;
  shortId: number;
  accounts: string[];
  updatesUntilDate: string;
  licenseToken: string | null;
}): string {
  const accList =
    input.accounts.filter(Boolean).join(", ") ||
    "Pendiente de registrar en legionai.iareal.net/cuenta";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Manual Windows — Legion SuperPanel v${escapeHtml(input.version)} MT4</title>
<style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="card">
    <h1>WINDOWS — Guia de Instalacion en 1 Minuto (MetaTrader 4)</h1>
    <p class="muted">Licencia #${input.shortId} · Cuentas MT4: <b>${escapeHtml(accList)}</b> · Actualizaciones hasta: <b>${escapeHtml(input.updatesUntilDate)}</b></p>
  </div>

  <div class="card">
    <h2>ESPAÑOL — 3 Clics en Windows</h2>
    <ol>
      <li>Abre tu <b>MetaTrader 4</b> y arriba a la izquierda haz clic en <b>Archivo → Abrir carpeta de datos</b>.</li>
      <li>Arrastra la carpeta <b><code>MQL4</code></b> de este archivo ZIP hacia esa ventana (si Windows pregunta combinar o reemplazar archivos, haz clic en <b>Sí</b>; esto guarda automaticamente el indicador en <code>MQL4\Indicators</code> y tu licencia en <code>MQL4\Files\${LICENSE_FILENAME}</code>).</li>
      <li>Regresa a MetaTrader 4, en el panel izquierdo <b>Navegador → Indicadores</b> haz clic derecho → <b>Actualizar</b> y arrastra <b>Legion_SuperPanel</b> a tu grafico.</li>
    </ol>
    ${
      input.licenseToken
        ? `<p class="muted"><b>Respaldo por codigo:</b> Si prefieres, tambien puedes pegar este codigo en la primera casilla <code>Codigo_Licencia</code> del indicador:</p><pre id="tok">${escapeHtml(input.licenseToken)}</pre><button onclick="navigator.clipboard.writeText(document.getElementById('tok').textContent)">Copiar Codigo_Licencia</button>`
        : ""
    }
  </div>

  <div class="card">
    <h2>ENGLISH — 3-Click Windows Setup</h2>
    <ol>
      <li>Open <b>MetaTrader 4</b> and click <b>File → Open Data Folder</b> in the top-left menu.</li>
      <li>Drag the <b><code>MQL4</code></b> folder from this ZIP into that Explorer window (confirm merge/replace if prompted).</li>
      <li>In MetaTrader 4's <b>Navigator → Indicators</b> panel, right-click → <b>Refresh</b> and attach <b>Legion_SuperPanel</b> to any chart.</li>
    </ol>
  </div>
</body>
</html>`;
}

export function buildMacManualHtml(input: {
  version: string;
  shortId: number;
  accounts: string[];
  updatesUntilDate: string;
  ex4Filename: string;
  licenseToken: string | null;
}): string {
  const accList =
    input.accounts.filter(Boolean).join(", ") ||
    "Pendiente de registrar en legionai.iareal.net/cuenta";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Manual macOS (Wine) — Legion SuperPanel v${escapeHtml(input.version)} MT4</title>
<style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="card">
    <h1>macOS (Mac) — Guia de Instalacion en Finder (MetaTrader 4 Wine)</h1>
    <p class="muted">Licencia #${input.shortId} · Cuentas MT4: <b>${escapeHtml(accList)}</b> · Actualizaciones hasta: <b>${escapeHtml(input.updatesUntilDate)}</b></p>
    <p class="muted">En Mac, MetaTrader 4 corre sobre Wine: <b>no uses</b> "Abrir carpeta de datos" dentro de MT4. Hazlo directamente desde <b>Finder</b> en 30 segundos:</p>
  </div>

  <div class="card">
    <h2>ESPAÑOL — 3 Pasos en Mac (Finder)</h2>
    <ol>
      <li>
        Abre <b>Finder</b>, presiona <b><code>Cmd ⌘ + Shift ⇧ + G</code></b> (menu <i>Ir → Ir a la carpeta...</i>) y usa <b>un boton por archivo</b> para no soltar nada fuera de su carpeta:
        <p style="margin:0.75rem 0 0.35rem"><b>1A. Indicador (.ex4)</b> — pega con Cmd+Shift+G y suelta ahi mismo el archivo <code>.ex4</code>:</p>
        <pre id="macpath-indicators">${escapeHtml(MAC_WINE_INDICATORS_PATH)}</pre>
        <button onclick="navigator.clipboard.writeText(document.getElementById('macpath-indicators').textContent)">Copiar ruta Mac para Indicador (.ex4)</button>
        <p style="margin:1rem 0 0.35rem"><b>1B. Licencia (.lic)</b> — pega con Cmd+Shift+G y suelta ahi mismo tu <code>${LICENSE_FILENAME}</code>:</p>
        <pre id="macpath-files">${escapeHtml(MAC_WINE_FILES_PATH)}</pre>
        <button onclick="navigator.clipboard.writeText(document.getElementById('macpath-files').textContent)">Copiar ruta Mac para Licencia (.lic)</button>
      </li>
      <li>
        Los archivos del ZIP van asi (cada uno a su carpeta, nunca sueltes nada en la carpeta padre <code>MQL4</code>):
        <ul>
          <li><b><code>${escapeHtml(input.ex4Filename)}</code></b> (de <code>MQL4/Indicators/</code> del ZIP) → carpeta <b><code>Indicators</code></b> abierta con el boton 1A.</li>
          <li><b><code>${LICENSE_FILENAME}</code></b> (de <code>MQL4/Files/</code> del ZIP) → carpeta <b><code>Files</code></b> abierta con el boton 1B.</li>
        </ul>
        <div class="warn"><b>OJO EN MAC:</b> No arrastres la carpeta <code>MQL4</code> completa dando "Reemplazar" en Finder porque macOS borraria tus otros indicadores. Usa los 2 botones de arriba y suelta cada archivo <b>dentro</b> de su carpeta.</div>
      </li>
      <li>Ve a tu ventana de <b>MetaTrader 4</b>, en el panel izquierdo <b>Navegador → Indicadores</b> haz clic derecho → <b>Actualizar</b> y arrastra <b>Legion_SuperPanel</b> al grafico. ¡Listo!</li>
    </ol>
    <p class="muted"><i>Nota: Si instalaste MT4 con el instalador personalizado de tu broker (por ejemplo XM o IC Markets) y esas rutas no existen, abre <code>~/Library/Application Support/</code> con <code>Cmd + Shift + G</code>, entra a la carpeta de tu broker/MT4 y abre <code>drive_c/Program Files (x86)/.../MQL4/Indicators</code> y <code>.../MQL4/Files</code>.</i></p>
    ${
      input.licenseToken
        ? `<p class="muted"><b>Alternativa aun mas rapida:</b> Si solo copiaste el <code>.ex4</code> a <code>Indicators</code>, pega este codigo una sola vez en la casilla <code>Codigo_Licencia</code> al abrir el indicador (se guardara solo en <code>Files</code>):</p><pre id="tokmac">${escapeHtml(input.licenseToken)}</pre><button onclick="navigator.clipboard.writeText(document.getElementById('tokmac').textContent)">Copiar Codigo_Licencia</button>`
        : ""
    }
  </div>

  <div class="card">
    <h2>ENGLISH — 3-Step macOS Setup (Finder + Wine)</h2>
    <ol>
      <li>Use the two buttons above: <b>Copiar ruta Mac para Indicador (.ex4)</b> and <b>Copiar ruta Mac para Licencia (.lic)</b>. In <b>Finder</b> press <b><code>Cmd ⌘ + Shift ⇧ + G</code></b>, paste each path, and drop the matching file <b>inside that folder</b>.</li>
      <li>Drop <b><code>${escapeHtml(input.ex4Filename)}</code></b> into <b><code>Indicators</code></b>, and drop <b><code>${LICENSE_FILENAME}</code></b> into <b><code>Files</code></b> (do <b>not</b> click "Replace" on the parent <code>MQL4</code> folder in Finder).</li>
      <li>In <b>MetaTrader 4</b>, right-click <b>Indicators → Refresh</b> in the Navigator panel and attach <b>Legion_SuperPanel</b> to your chart.</li>
    </ol>
  </div>
</body>
</html>`;
}

export async function buildCustomerAllInOneZip(input: {
  ex4Path: string;
  ex4Filename: string;
  version: string;
  shortId: number;
  accounts: string[];
  updatesUntilDate: string;
  licenseToken: string | null;
}): Promise<Buffer> {
  const ex4Bytes = await readFile(input.ex4Path);
  const winHtml = buildWindowsManualHtml({
    version: input.version,
    shortId: input.shortId,
    accounts: input.accounts,
    updatesUntilDate: input.updatesUntilDate,
    licenseToken: input.licenseToken,
  });
  const macHtml = buildMacManualHtml({
    version: input.version,
    shortId: input.shortId,
    accounts: input.accounts,
    updatesUntilDate: input.updatesUntilDate,
    ex4Filename: input.ex4Filename,
    licenseToken: input.licenseToken,
  });

  const entries: Array<{ name: string; data: Buffer | string }> = [
    {
      name: `MQL4/Indicators/${input.ex4Filename}`,
      data: ex4Bytes,
    },
    {
      name: "MANUAL_WINDOWS.html",
      data: winHtml,
    },
    {
      name: "MANUAL_MAC.html",
      data: macHtml,
    },
  ];

  if (input.licenseToken) {
    entries.push({
      name: `MQL4/Files/${LICENSE_FILENAME}`,
      data: `${input.licenseToken}
`,
    });
  }

  return buildZipStore(entries);
}

