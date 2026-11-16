"use client";

/**
 * TutorialInstalacionLegion.tsx
 * Reproductor de video tutorial animado paso a paso ("a prueba de novatos")
 * para instalar y activar Legion SuperPanel v3.15 en MetaTrader 4 (Windows y Mac con Wine).
 *
 * - Un solo archivo, sin dependencias externas (solo React).
 * - Escenario fijo de 960x540 escalado de forma uniforme: nunca deforma letras.
 * - Animaciones solo con transform / opacity.
 * - Voz guía con MP3 reales en /tutorial-audio/{win|mac}-{1..4}.mp3
 *   (fallback a window.speechSynthesis solo si audio.play() falla) + subtítulos.
 *
 * Uso en Next.js:  import TutorialInstalacionLegion from "@/components/TutorialInstalacionLegion";
 */

import React, { useCallback, useEffect, useRef, useState } from "react";

/* ───────────────────────── Tipos y constantes ───────────────────────── */

type OS = "win" | "mac";
type ClickKind = "l" | "r";
type KeyFrame = [number, number, number]; // [ms, x, y]

interface SceneProps {
  t: number;
  os: OS;
}

interface SceneDef {
  title: string;
  dur: number;
  sub: string;
  voice: string;
  path: KeyFrame[];
  clicks: [number, ClickKind][];
  drags?: { a: number; b: number; label: string }[];
  carry?: { a: number; b: number; label: string }[];
  Render: (p: SceneProps) => React.ReactElement;
}

const STAGE_W = 960;
const STAGE_H = 540;

const C = {
  bg: "#0B0F17",
  surf: "#111827",
  surf2: "#0E1521",
  border: "#293548",
  em: "#24D3A9",
  blue: "#38BDF8",
  text: "#E6EDF7",
  mute: "#94A3B8",
  yellow: "#FDE047",
  red: "#F87171",
  amber: "#FBBF24",
};

const FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const FILE_EX4 = "Legion_SuperPanel_v3_15_MT4.ex4";
const IND_NAME = "Legion_SuperPanel_v3_15_MT4";
const ACCOUNT = "57093041";
const LIC_CODE = "LGN1-TEdOMQAAAAEAAAAAATavmQ...";
const MAC_PATH =
  "~/Library/Application Support/net.metaquotes.wine.metatrader4/drive_c/Program Files (x86)/MetaTrader 4/MQL4/Indicators";

/* ───────────────────────── Utilidades de tiempo ───────────────────────── */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const between = (t: number, a: number, b: number) => t >= a && t < b;

function cursorAt(path: KeyFrame[], t: number) {
  if (t <= path[0][0]) return { x: path[0][1], y: path[0][2] };
  for (let i = 1; i < path.length; i++) {
    const [t1, x1, y1] = path[i];
    const [t0, x0, y0] = path[i - 1];
    if (t <= t1) {
      const p = easeInOut(seg(t, t0, t1));
      return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p };
    }
  }
  const l = path[path.length - 1];
  return { x: l[1], y: l[2] };
}

/* ───────────────────────── Primitivas visuales ───────────────────────── */

function Abs({
  x,
  y,
  w,
  h,
  style,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", ...style }}>
      {children}
    </div>
  );
}

/** Capa a pantalla completa que aparece en `a` y desaparece en `b` (solo opacity + transform). */
function Layer({
  t,
  a = -9999,
  b = Infinity,
  z,
  rise = 14,
  children,
}: {
  t: number;
  a?: number;
  b?: number;
  z?: number;
  rise?: number;
  children?: React.ReactNode;
}) {
  const pin = easeOut(seg(t, a, a + 320));
  const pout = b === Infinity ? 0 : easeOut(seg(t, b, b + 260));
  const o = pin * (1 - pout);
  if (o <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: z,
        opacity: o,
        transform: `translate3d(0, ${((1 - pin) * rise).toFixed(2)}px, 0)`,
      }}
    >
      {children}
    </div>
  );
}

function TrafficLights() {
  return (
    <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c, display: "block" }} />
      ))}
    </div>
  );
}

function WinControls({ dark }: { dark: boolean }) {
  const col = dark ? "#C7D2E2" : "#333";
  return (
    <div style={{ display: "flex", gap: 18, fontSize: 12, color: col, flexShrink: 0, fontFamily: FONT }}>
      <span>—</span>
      <span>☐</span>
      <span>✕</span>
    </div>
  );
}

function Frame({
  os,
  x,
  y,
  w,
  h,
  title,
  dark = true,
  glow = false,
}: {
  os: OS;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  dark?: boolean;
  glow?: boolean;
}) {
  const mac = os === "mac";
  return (
    <Abs
      x={x}
      y={y}
      w={w}
      h={h}
      style={{
        background: dark ? "#0F1622" : "#F0F0F0",
        borderRadius: mac ? 10 : 6,
        border: `1px solid ${glow ? C.em : dark ? "#2A3445" : "#9AA5B4"}`,
        boxShadow: glow
          ? `0 0 0 3px rgba(36,211,169,.25), 0 24px 60px rgba(0,0,0,.55)`
          : "0 24px 60px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 28,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 10,
          background: dark ? "#172031" : mac ? "#E3E5EA" : "#FFFFFF",
          borderBottom: `1px solid ${dark ? "#2A3445" : "#C3CAD4"}`,
          color: dark ? "#D3DCEA" : "#1F2937",
          fontSize: 12,
          fontFamily: FONT,
        }}
      >
        {mac && <TrafficLights />}
        <div
          style={{
            flex: 1,
            textAlign: mac ? "center" : "left",
            whiteSpace: "nowrap",
            fontWeight: mac ? 600 : 400,
            marginRight: mac ? 50 : 0,
          }}
        >
          {title}
        </div>
        {!mac && <WinControls dark={dark} />}
      </div>
    </Abs>
  );
}

type FileKind = "ex4" | "html" | "zip" | "folder";

function FileIcon({ kind, size = 20 }: { kind: FileKind; size?: number }) {
  if (kind === "folder") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
        <path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h4.2l2 2.2h8.8A2.5 2.5 0 0 1 22 8.7v8.8A2.5 2.5 0 0 1 19.5 20h-15A2.5 2.5 0 0 1 2 17.5z" fill="#F4C34F" />
        <path d="M2 9h20v8.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5z" fill="#FFD666" />
      </svg>
    );
  }
  const map: Record<string, { bg: string; tag: string }> = {
    ex4: { bg: C.em, tag: "EX4" },
    html: { bg: C.blue, tag: "HTML" },
    zip: { bg: "#A78BFA", tag: "ZIP" },
  };
  const m = map[kind];
  return (
    <div
      style={{
        width: size * 0.82,
        height: size,
        borderRadius: 3,
        background: "#E8EEF6",
        position: "relative",
        flexShrink: 0,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -3,
          right: -3,
          bottom: size * 0.18,
          height: size * 0.36,
          background: m.bg,
          borderRadius: 2,
          color: "#06251E",
          fontSize: size * 0.26,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT,
          letterSpacing: 0.2,
        }}
      >
        {m.tag}
      </div>
    </div>
  );
}

function FileRow({
  x,
  y,
  w,
  h = 30,
  kind,
  name,
  meta,
  hl = false,
  fresh = false,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  kind: FileKind;
  name: string;
  meta?: string;
  hl?: boolean;
  fresh?: boolean;
}) {
  return (
    <Abs
      x={x}
      y={y}
      w={w}
      h={h}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 10px",
        borderRadius: 6,
        background: hl ? "rgba(56,189,248,.22)" : fresh ? "rgba(36,211,169,.16)" : "transparent",
        boxShadow: hl ? `inset 0 0 0 1px ${C.blue}` : fresh ? `inset 0 0 0 1px ${C.em}` : "none",
        color: "#E2E8F0",
        fontSize: 13,
        fontFamily: FONT,
      }}
    >
      <FileIcon kind={kind} size={18} />
      <span style={{ flex: 1, whiteSpace: "nowrap" }}>{name}</span>
      {meta && <span style={{ color: C.mute, fontSize: 11.5, whiteSpace: "nowrap" }}>{meta}</span>}
    </Abs>
  );
}

function Callout({
  x,
  y,
  w,
  text,
  tone = "em",
  arrow = "up",
}: {
  x: number;
  y: number;
  w: number;
  text: React.ReactNode;
  tone?: "em" | "amber" | "blue" | "red";
  arrow?: "up" | "down" | "left" | "none";
}) {
  const col = tone === "em" ? C.em : tone === "amber" ? C.amber : tone === "blue" ? C.blue : C.red;
  const arrowStyle: React.CSSProperties =
    arrow === "up"
      ? { left: 24, top: -7, transform: "rotate(45deg)" }
      : arrow === "down"
      ? { left: 24, bottom: -7, transform: "rotate(45deg)" }
      : arrow === "left"
      ? { left: -7, top: "50%", marginTop: -7, transform: "rotate(45deg)" }
      : { display: "none" };
  return (
    <Abs
      x={x}
      y={y}
      w={w}
      style={{
        background: "#0B1220",
        border: `2px solid ${col}`,
        borderRadius: 10,
        padding: "8px 12px",
        color: "#F8FAFC",
        fontFamily: FONT,
        fontSize: 13.5,
        fontWeight: 700,
        lineHeight: 1.35,
        boxShadow: `0 10px 30px rgba(0,0,0,.5), 0 0 24px ${col}40`,
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          background: "#0B1220",
          borderLeft: `2px solid ${col}`,
          borderTop: `2px solid ${col}`,
          ...arrowStyle,
          ...(arrow === "down" ? { borderLeft: "none", borderTop: "none", borderRight: `2px solid ${col}`, borderBottom: `2px solid ${col}` } : {}),
        }}
      />
      {text}
    </Abs>
  );
}

/* ───────────────────────── Escritorio ───────────────────────── */

function Desktop({ os }: { os: OS }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          os === "win"
            ? "radial-gradient(120% 90% at 20% 0%, #1D3A63 0%, #0B1526 55%, #060A12 100%)"
            : "radial-gradient(120% 90% at 80% 0%, #3A2B5E 0%, #141A2F 55%, #080B14 100%)",
      }}
    >
      {os === "win" ? (
        <Abs
          x={0}
          y={512}
          w={STAGE_W}
          h={28}
          style={{
            background: "rgba(14,20,32,.92)",
            borderTop: "1px solid #253047",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            fontFamily: FONT,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <rect x="0" y="0" width="6.4" height="6.4" fill={C.blue} />
            <rect x="7.6" y="0" width="6.4" height="6.4" fill={C.blue} />
            <rect x="0" y="7.6" width="6.4" height="6.4" fill={C.blue} />
            <rect x="7.6" y="7.6" width="6.4" height="6.4" fill={C.blue} />
          </svg>
          <span style={{ width: 120, height: 16, borderRadius: 8, background: "#1E293B", display: "block" }} />
          <span style={{ position: "absolute", right: 14, color: "#CBD5E1", fontSize: 11 }}>17:42</span>
        </Abs>
      ) : (
        <Abs
          x={0}
          y={0}
          w={STAGE_W}
          h={22}
          style={{
            background: "rgba(20,24,38,.75)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "0 14px",
            color: "#E2E8F0",
            fontSize: 12,
            fontFamily: FONT,
          }}
        >
          <span style={{ display: "flex", transform: "scale(.7)" }}><AppleLogo /></span>
          <b>Finder</b>
          <span>Archivo</span>
          <span>Edición</span>
          <span>Ir</span>
          <span>Ventana</span>
          <span style={{ marginLeft: "auto" }}>lun 17:42</span>
        </Abs>
      )}
    </div>
  );
}

/* ───────────────────────── Navegador web + panel /cuenta ───────────────────────── */

const BR = { x: 40, y: 34, w: 880, h: 462 };

function BrowserChrome({ os, downloaded = false }: { os: OS; downloaded?: boolean }) {
  const mac = os === "mac";
  return (
    <>
      <Abs
        x={BR.x}
        y={BR.y}
        w={BR.w}
        h={BR.h}
        style={{
          background: C.bg,
          borderRadius: mac ? 10 : 8,
          border: "1px solid #2A3445",
          boxShadow: "0 24px 60px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      />
      {/* barra de pestañas */}
      <Abs
        x={BR.x + 1}
        y={BR.y + 1}
        w={BR.w - 2}
        h={34}
        style={{
          background: "#151D2B",
          display: "flex",
          alignItems: "flex-end",
          padding: "0 12px",
          gap: 10,
          borderRadius: mac ? "10px 10px 0 0" : "8px 8px 0 0",
          fontFamily: FONT,
        }}
      >
        {mac && (
          <div style={{ alignSelf: "center" }}>
            <TrafficLights />
          </div>
        )}
        <div
          style={{
            background: C.bg,
            color: "#E2E8F0",
            fontSize: 12,
            padding: "7px 14px",
            borderRadius: "8px 8px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 3, background: C.em, display: "block" }} />
          Legion AI · Mi cuenta
        </div>
        {!mac && (
          <div style={{ marginLeft: "auto", alignSelf: "center" }}>
            <WinControls dark />
          </div>
        )}
      </Abs>
      {/* barra de dirección */}
      <Abs
        x={BR.x + 1}
        y={BR.y + 35}
        w={BR.w - 2}
        h={36}
        style={{
          background: C.bg,
          borderBottom: "1px solid #1F2A3C",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 14px",
          fontFamily: FONT,
          color: C.mute,
          fontSize: 14,
        }}
      >
        <span>←</span>
        <span>→</span>
        <span>⟳</span>
        <div
          style={{
            flex: 1,
            height: 24,
            borderRadius: 12,
            background: "#162032",
            border: "1px solid #24324A",
            display: "flex",
            alignItems: "center",
            justifyContent: mac ? "center" : "flex-start",
            padding: "0 12px",
            gap: 6,
            fontSize: 12.5,
            color: "#E2E8F0",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: C.em }}>🔒</span>
          <span>
            legionai.iareal.net<b style={{ color: C.em }}>/cuenta</b>
          </span>
        </div>
        <span
          style={{
            color: downloaded ? C.em : C.mute,
            fontWeight: 700,
            transition: "none",
          }}
        >
          ⤓
        </span>
      </Abs>
    </>
  );
}

interface PageState {
  dlPressed?: boolean;
  macCopied?: boolean;
  acct?: string;
  acctFocus?: boolean;
  saving?: boolean;
  saved?: boolean;
  codeReady?: boolean;
  copied?: boolean;
  pulse?: "dl" | "mac" | "save" | "copy" | null;
  t: number;
}

function Btn({
  x,
  y,
  w,
  h,
  label,
  variant,
  pressed,
  pulse,
  t,
  size = 14,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: React.ReactNode;
  variant: "em" | "blue" | "dark" | "ghost";
  pressed?: boolean;
  pulse?: boolean;
  t: number;
  size?: number;
}) {
  const styles: Record<string, React.CSSProperties> = {
    em: { background: `linear-gradient(180deg, #2EE6B8, ${C.em})`, color: "#03241B", border: "1px solid #5EF0C9" },
    blue: { background: "rgba(56,189,248,.14)", color: "#BAE6FD", border: `1px solid ${C.blue}` },
    dark: { background: "#05070B", color: "#F8FAFC", border: "1px solid #000" },
    ghost: { background: "#162032", color: "#E2E8F0", border: "1px solid #2A3A55" },
  };
  const glow = pulse ? 0.45 + 0.35 * Math.sin(t / 140) : 0;
  return (
    <Abs
      x={x}
      y={y}
      w={w}
      h={h}
      style={{
        ...styles[variant],
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size,
        whiteSpace: "nowrap",
        transform: `scale(${pressed ? 0.96 : 1})`,
        boxShadow: pulse
          ? `0 0 0 ${3 + glow * 4}px rgba(${variant === "blue" ? "56,189,248" : "36,211,169"},${0.25 + glow * 0.25})`
          : "0 4px 14px rgba(0,0,0,.35)",
      }}
    >
      {label}
    </Abs>
  );
}

function CuentaPage({ os, s }: { os: OS; s: PageState }) {
  const t = s.t;
  const mac = os === "mac";
  return (
    <>
      {/* encabezado */}
      <Abs
        x={64}
        y={112}
        w={832}
        h={36}
        style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: FONT, color: C.text }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: `linear-gradient(135deg, ${C.em}, ${C.blue})`,
            display: "block",
          }}
        />
        <b style={{ fontSize: 16, letterSpacing: 0.6 }}>LEGION AI</b>
        <span style={{ color: C.mute, fontSize: 13 }}>· Mi cuenta</span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: C.em,
            border: `1px solid ${C.em}55`,
            padding: "4px 10px",
            borderRadius: 99,
            whiteSpace: "nowrap",
          }}
        >
          ● Plan activo · 3 cuentas MT4
        </span>
      </Abs>

      {/* Tarjeta izquierda: paquete */}
      <Abs
        x={64}
        y={160}
        w={380}
        h={320}
        style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14 }}
      />
      <Abs x={84} y={174} w={340} style={{ fontFamily: FONT, color: C.text, fontSize: 15, fontWeight: 800 }}>
        1 · Tu paquete de instalación
      </Abs>
      <Abs x={84} y={198} w={340} style={{ fontFamily: FONT, color: C.mute, fontSize: 12.5 }}>
        Indicador + manuales para Windows y Mac
      </Abs>
      <Btn
        t={t}
        x={84}
        y={230}
        w={340}
        h={52}
        variant="em"
        label={<>⤓ Descargar Paquete Todo-en-Uno (.ZIP)</>}
        pressed={s.dlPressed}
        pulse={s.pulse === "dl"}
      />
      {mac ? (
        <>
          <Btn
            t={t}
            x={84}
            y={298}
            w={340}
            h={44}
            variant="blue"
            size={13.5}
            label={s.macCopied ? <>✓ Ruta copiada</> : <>⧉ Copiar ruta Indicators (Mac)</>}
            pressed={s.pulse === "mac" && s.macCopied}
            pulse={s.pulse === "mac"}
          />
          <Abs
            x={84}
            y={352}
            w={340}
            h={112}
            style={{
              background: "#0A111C",
              border: `1px dashed ${s.macCopied ? C.blue : "#2A3A55"}`,
              borderRadius: 8,
              padding: "8px 10px",
              fontFamily: MONO,
              fontSize: 10.5,
              lineHeight: 1.45,
              color: s.macCopied ? "#BAE6FD" : "#7C8DA6",
              wordBreak: "break-all",
            }}
          >
            {MAC_PATH}
          </Abs>
        </>
      ) : (
        <Abs x={84} y={300} w={340} style={{ fontFamily: FONT, color: "#CBD5E1", fontSize: 12.5, lineHeight: 1.9 }}>
          <div style={{ color: C.mute, fontWeight: 700 }}>Incluye:</div>
          <div>
            <span style={{ color: C.em }}>●</span> {FILE_EX4}
          </div>
          <div>
            <span style={{ color: C.blue }}>●</span> MANUAL_WINDOWS.html
          </div>
          <div>
            <span style={{ color: C.blue }}>●</span> MANUAL_MAC.html
          </div>
        </Abs>
      )}

      {/* Tarjeta derecha: cuentas + caja verde */}
      <Abs
        x={464}
        y={160}
        w={432}
        h={320}
        style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 14 }}
      />
      <Abs x={484} y={172} w={392} style={{ fontFamily: FONT, color: C.text, fontSize: 15, fontWeight: 800 }}>
        2 · Tus cuentas MT4 (hasta 3)
      </Abs>
      {[0, 1, 2].map((i) => {
        const focus = i === 0 && s.acctFocus;
        const val = i === 0 ? s.acct || "" : "";
        return (
          <Abs
            key={i}
            x={484}
            y={200 + i * 40}
            w={392}
            h={34}
            style={{
              background: "#0A111C",
              border: `1px solid ${focus ? C.em : "#2A3A55"}`,
              boxShadow: focus ? "0 0 0 3px rgba(36,211,169,.2)" : "none",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 10,
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            <span style={{ color: C.mute, width: 70, flexShrink: 0 }}>Cuenta #{i + 1}</span>
            <span style={{ color: "#F1F5F9", fontFamily: MONO, fontSize: 14, letterSpacing: 0.5 }}>
              {val}
              {focus && !s.saved && <span className="lgt-caret">|</span>}
            </span>
            {!val && !focus && <span style={{ color: "#475569" }}>Número de cuenta</span>}
            {i === 0 && s.saved && (
              <span style={{ marginLeft: "auto", color: C.em, fontWeight: 700, fontSize: 12 }}>✓ Guardada</span>
            )}
          </Abs>
        );
      })}
      <Btn
        t={t}
        x={484}
        y={324}
        w={392}
        h={40}
        variant="ghost"
        size={13.5}
        label={
          s.saving ? (
            <>
              <span className="lgt-spin" /> Generando licencia…
            </>
          ) : (
            <>💾 Guardar Cuentas y Generar Licencia</>
          )
        }
        pressed={s.saving}
        pulse={s.pulse === "save"}
      />
      {/* Caja verde — Opción A */}
      <Abs
        x={484}
        y={374}
        w={392}
        h={96}
        style={{
          background: s.codeReady ? "rgba(36,211,169,.14)" : "rgba(36,211,169,.05)",
          border: `2px solid ${s.codeReady ? C.em : "#1E5547"}`,
          borderRadius: 12,
          boxShadow: s.codeReady ? "0 0 30px rgba(36,211,169,.28)" : "none",
        }}
      />
      <Abs x={498} y={382} w={364} style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 800, color: C.em, letterSpacing: 0.4 }}>
        OPCIÓN A · RECOMENDADA — pega este código en Inputs
      </Abs>
      <Abs x={498} y={401} w={364} style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: s.codeReady ? "#F0FDF9" : "#3B5A52", letterSpacing: 0.6 }}>
        {s.codeReady ? LIC_CODE : "LGN1-····-····-····-····"}
      </Abs>
      <Btn
        t={t}
        x={498}
        y={430}
        w={200}
        h={30}
        variant="dark"
        size={12.5}
        label={s.copied ? <>✓ ¡Copiado!</> : <>⧉ Copiar Codigo_Licencia</>}
        pressed={s.pulse === "copy" && s.copied}
        pulse={s.pulse === "copy"}
      />
    </>
  );
}

/* ───────────────────────── MetaTrader 4 ───────────────────────── */

const CANDLES = (() => {
  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const out: { o: number; c: number; h: number; l: number }[] = [];
  let p = 50;
  for (let i = 0; i < 70; i++) {
    const o = p;
    const c = o + (rnd() - 0.46) * 5;
    out.push({ o, c, h: Math.max(o, c) + rnd() * 2.4, l: Math.min(o, c) - rnd() * 2.4 });
    p = c;
  }
  return out;
})();

function Chart({ x, y, w, h, glow = 0 }: { x: number; y: number; w: number; h: number; glow?: number }) {
  const hi = Math.max(...CANDLES.map((c) => c.h));
  const lo = Math.min(...CANDLES.map((c) => c.l));
  const plotW = w - 56;
  const sy = (v: number) => 14 + ((hi - v) / (hi - lo)) * (h - 40);
  const step = plotW / CANDLES.length;
  return (
    <Abs x={x} y={y} w={w} h={h} style={{ background: "#000", overflow: "hidden" }}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={0} x2={plotW} y1={20 + i * ((h - 40) / 4)} y2={20 + i * ((h - 40) / 4)} stroke="#1A2433" strokeDasharray="3 4" />
        ))}
        {CANDLES.map((c, i) => {
          const cx = i * step + step / 2;
          const up = c.c >= c.o;
          const col = up ? "#22C55E" : "#EF4444";
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={sy(c.h)} y2={sy(c.l)} stroke={col} strokeWidth={1} />
              <rect
                x={cx - step * 0.32}
                y={sy(Math.max(c.o, c.c))}
                width={step * 0.64}
                height={Math.max(1, Math.abs(sy(c.o) - sy(c.c)))}
                fill={up ? "#000" : col}
                stroke={col}
              />
            </g>
          );
        })}
        <line x1={plotW} x2={plotW} y1={0} y2={h} stroke="#334155" />
        {[0, 1, 2, 3, 4].map((i) => (
          <text key={i} x={plotW + 6} y={24 + i * ((h - 40) / 4)} fill="#94A3B8" fontSize={10} fontFamily={MONO}>
            {(1.0842 - i * 0.0016).toFixed(4)}
          </text>
        ))}
        <text x={8} y={h - 8} fill="#64748B" fontSize={10} fontFamily={MONO}>
          EURUSD,H1
        </text>
      </svg>
      {glow > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: glow,
            boxShadow: `inset 0 0 0 2px ${C.em}, inset 0 0 70px rgba(36,211,169,.35)`,
          }}
        />
      )}
    </Abs>
  );
}

const MT = { x: 20, y: 28, w: 920, h: 478 };
const MENU_ITEMS = ["Archivo", "Ver", "Insertar", "Gráficos", "Herramientas", "Ventana", "Ayuda"];
const ARCHIVO_ITEMS = [
  "Nuevo gráfico",
  "Abrir sin conexión",
  "Abrir eliminados",
  "Perfiles",
  "Cerrar",
  "Guardar como…",
  "Abrir carpeta de datos",
  "Imprimir…",
  "Salir",
];
const DEFAULT_INDICATORS = ["Accelerator Oscillator", "Accumulation", "Alligator", "Awesome Oscillator", "Bears Power"];

function MT4({
  os,
  t,
  menuOpen = false,
  menuHover = false,
  archivoHover = false,
  ctxOpen = false,
  ctxHover = false,
  indicHover = false,
  refreshed = false,
  flash = false,
  chartGlow = 0,
  children,
}: {
  os: OS;
  t: number;
  menuOpen?: boolean;
  menuHover?: boolean;
  archivoHover?: boolean;
  ctxOpen?: boolean;
  ctxHover?: boolean;
  indicHover?: boolean;
  refreshed?: boolean;
  flash?: boolean;
  chartGlow?: number;
  children?: React.ReactNode;
}) {
  const mac = os === "mac";
  const flashA = flash ? 0.5 + 0.5 * Math.sin(t / 110) : 0;
  return (
    <>
      <Frame
        os={os}
        dark={false}
        x={MT.x}
        y={MT.y}
        w={MT.w}
        h={MT.h}
        title={mac ? "MetaTrader 4 (Wine) — 57093041: TuBroker-Live — [EURUSD,H1]" : "57093041: TuBroker-Live - Cuenta real - [EURUSD,H1]"}
      />
      {/* menú */}
      <Abs
        x={MT.x + 1}
        y={52}
        w={MT.w - 2}
        h={22}
        style={{ background: "#F0F0F0", display: "flex", alignItems: "center", fontFamily: FONT, fontSize: 12.5, color: "#111" }}
      >
        {MENU_ITEMS.map((m, i) => (
          <span
            key={m}
            style={{
              padding: "3px 9px",
              marginLeft: i === 0 ? 6 : 0,
              background: i === 0 && (menuOpen || archivoHover) ? "#CCE4F7" : "transparent",
              outline: i === 0 && (menuOpen || archivoHover) ? "1px solid #99C9EF" : "none",
            }}
          >
            {m}
          </span>
        ))}
      </Abs>
      {/* barra de herramientas */}
      <Abs
        x={MT.x + 1}
        y={74}
        w={MT.w - 2}
        h={26}
        style={{
          background: "#E9E9E9",
          borderTop: "1px solid #D0D0D0",
          borderBottom: "1px solid #C8C8C8",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
        }}
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 3,
              background: i === 5 ? "#3B82F6" : i === 9 ? "#22C55E" : "#C9CED6",
              display: "block",
              marginRight: i === 4 || i === 10 ? 8 : 0,
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 12,
            fontFamily: FONT,
            fontSize: 11.5,
            color: "#fff",
            background: "#16A34A",
            borderRadius: 3,
            padding: "2px 8px",
          }}
        >
          Trading algorítmico
        </span>
      </Abs>
      {/* Navegador */}
      <Abs x={MT.x + 1} y={100} w={240} h={MT.h - 73} style={{ background: "#FFFFFF", borderRight: "1px solid #C8C8C8" }} />
      <Abs
        x={MT.x + 1}
        y={100}
        w={240}
        h={22}
        style={{ background: "#E4E8EE", fontFamily: FONT, fontSize: 12, color: "#111", padding: "4px 8px", fontWeight: 600 }}
      >
        Navegador
      </Abs>
      <TreeItem x={30} y={128} label="MetaTrader 4" icon="📊" />
      <TreeItem x={46} y={152} label="Cuentas" icon="👤" />
      <TreeItem x={46} y={176} label="Indicadores" icon="📈" hl={indicHover || ctxOpen} />
      {refreshed && (
        <Abs
          x={62}
          y={200}
          w={194}
          h={24}
          style={{
            background: `rgba(36,211,169,${0.18 + flashA * 0.3})`,
            boxShadow: `inset 0 0 0 1px ${C.em}`,
            borderRadius: 3,
          }}
        />
      )}
      {refreshed && <TreeItem x={66} y={200} label={IND_NAME} icon="⚡" bold small />}
      {DEFAULT_INDICATORS.map((n, i) => (
        <TreeItem key={n} x={66} y={(refreshed ? 224 : 200) + i * 24} label={n} icon="〰" muted />
      ))}
      <TreeItem x={46} y={(refreshed ? 224 : 200) + DEFAULT_INDICATORS.length * 24} label="Asesores Expertos" icon="🤖" />
      <TreeItem x={46} y={(refreshed ? 248 : 224) + DEFAULT_INDICATORS.length * 24} label="Scripts" icon="📜" />

      <Chart x={262} y={100} w={677} h={MT.h - 73} glow={chartGlow} />
      {children}

      {/* menú Archivo desplegado */}
      {menuOpen && (
        <Abs
          x={22}
          y={74}
          w={300}
          style={{
            background: "#F9F9F9",
            border: "1px solid #A0A0A0",
            boxShadow: "4px 6px 14px rgba(0,0,0,.35)",
            padding: "4px 0",
            fontFamily: FONT,
            fontSize: 12.5,
            color: "#111",
            zIndex: 5,
          }}
        >
          {ARCHIVO_ITEMS.map((it, i) => (
            <div
              key={it}
              style={{
                height: 24,
                display: "flex",
                alignItems: "center",
                padding: "0 26px",
                background: i === 6 && menuHover ? "#CCE4F7" : "transparent",
                fontWeight: i === 6 ? 700 : 400,
                whiteSpace: "nowrap",
                borderTop: i === 7 ? "1px solid #DADADA" : "none",
              }}
            >
              {it}
              {i === 6 && <span style={{ marginLeft: "auto", color: "#555", fontWeight: 400 }}>Ctrl+Shift+D</span>}
            </div>
          ))}
        </Abs>
      )}
      {/* menú contextual Indicadores */}
      {ctxOpen && (
        <Abs
          x={110}
          y={192}
          w={190}
          style={{
            background: "#F9F9F9",
            border: "1px solid #A0A0A0",
            boxShadow: "4px 6px 14px rgba(0,0,0,.35)",
            padding: "4px 0",
            fontFamily: FONT,
            fontSize: 12.5,
            color: "#111",
            zIndex: 5,
          }}
        >
          {["Crear en MetaEditor", "Actualizar", "Configurar…"].map((it, i) => (
            <div
              key={it}
              style={{
                height: 24,
                display: "flex",
                alignItems: "center",
                padding: "0 22px",
                background: i === 1 && ctxHover ? "#CCE4F7" : "transparent",
                fontWeight: i === 1 ? 700 : 400,
              }}
            >
              {it}
            </div>
          ))}
        </Abs>
      )}
    </>
  );
}

function TreeItem({
  x,
  y,
  label,
  icon,
  hl = false,
  bold = false,
  muted = false,
  small = false,
}: {
  x: number;
  y: number;
  label: string;
  icon: string;
  hl?: boolean;
  bold?: boolean;
  muted?: boolean;
  small?: boolean;
}) {
  return (
    <Abs
      x={x}
      y={y}
      h={24}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT,
        fontSize: small ? 10.5 : 12.5,
        color: muted ? "#555" : "#111",
        fontWeight: bold ? 700 : 400,
        whiteSpace: "nowrap",
        background: hl ? "#CCE4F7" : "transparent",
        padding: "0 4px",
        borderRadius: 2,
      }}
    >
      <span style={{ fontSize: 11 }}>{icon}</span>
      {label}
    </Abs>
  );
}

function LicenseCard({ selected = false, faint = false }: { selected?: boolean; faint?: boolean }) {
  return (
    <>
      <Abs
        x={440}
        y={150}
        w={420}
        h={150}
        style={{
          background: "rgba(10,14,22,.96)",
          border: "1px solid #3A4A63",
          borderRadius: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,.6)",
          opacity: faint ? 0.95 : 1,
        }}
      />
      <Abs
        x={456}
        y={160}
        w={390}
        h={28}
        style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: FONT, whiteSpace: "nowrap" }}
      >
        <b style={{ color: "#F8FAFC", fontSize: 14, letterSpacing: 0.5 }}>LEGION SUPERPANEL v3.15</b>
        <span
          style={{
            color: "#FECACA",
            background: "rgba(248,113,113,.16)",
            border: `1px solid ${C.red}`,
            borderRadius: 5,
            padding: "2px 6px",
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          [LICENSE REQUIRED]
        </span>
      </Abs>
      <Abs x={456} y={200} w={390} h={24} style={{ fontFamily: MONO, fontSize: 13.5, color: "#CBD5E1", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
        MT4 Account:&nbsp;
        <span
          style={{
            color: selected ? "#fff" : C.yellow,
            background: selected ? "#2563EB" : "transparent",
            padding: "1px 3px",
            borderRadius: 3,
            fontWeight: 700,
          }}
        >
          {ACCOUNT}
        </span>
        &nbsp;| Broker: TuBroker-Live
      </Abs>
      <Abs x={456} y={232} w={390} style={{ fontFamily: FONT, fontSize: 12.5, color: C.mute }}>
        Estado: esperando <b style={{ color: "#E2E8F0" }}>Codigo_Licencia</b>
      </Abs>
      <Abs x={456} y={256} w={390} style={{ fontFamily: FONT, fontSize: 12.5, color: C.mute }}>
        Registra esta cuenta en <b style={{ color: C.em }}>legionai.iareal.net/cuenta</b>
      </Abs>
    </>
  );
}

function Dashboard({ t, a }: { t: number; a: number }) {
  const p = easeOut(seg(t, a, a + 700));
  const rows: [string, string, string][] = [
    ["Licencia", "VÁLIDA ✓ · 3 cuentas", C.em],
    ["Tendencia H1", "ALCISTA ▲", "#22C55E"],
    ["Señal actual", "COMPRA", "#22C55E"],
    ["Momentum (RSI)", "61.4", "#E2E8F0"],
    ["Volatilidad (ATR)", "14.2 pips", "#E2E8F0"],
    ["Spread", "0.8 pips", "#E2E8F0"],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p, transform: `translate3d(0, ${(1 - p) * 16}px, 0)` }}>
      <Abs
        x={278}
        y={112}
        w={330}
        h={300}
        style={{
          background: "linear-gradient(180deg, rgba(17,24,39,.97), rgba(11,15,23,.97))",
          border: `1px solid ${C.em}`,
          borderRadius: 14,
          boxShadow: "0 0 40px rgba(36,211,169,.35), 0 20px 50px rgba(0,0,0,.6)",
        }}
      />
      <Abs x={296} y={124} w={296} h={30} style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: FONT }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: C.em, boxShadow: `0 0 10px ${C.em}`, display: "block" }} />
        <b style={{ color: "#F8FAFC", fontSize: 14.5, letterSpacing: 0.4, whiteSpace: "nowrap" }}>LEGION SUPERPANEL v3.15</b>
        <span
          style={{
            marginLeft: "auto",
            color: "#03241B",
            background: C.em,
            fontSize: 10.5,
            fontWeight: 900,
            padding: "2px 7px",
            borderRadius: 5,
          }}
        >
          ACTIVO
        </span>
      </Abs>
      {rows.map(([k, v, col], i) => (
        <Abs
          key={k}
          x={296}
          y={166 + i * 30}
          w={296}
          h={26}
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: FONT,
            fontSize: 12.5,
            borderBottom: "1px solid #1E293B",
            opacity: easeOut(seg(t, a + 200 + i * 90, a + 500 + i * 90)),
          }}
        >
          <span style={{ color: C.mute }}>{k}</span>
          <b style={{ marginLeft: "auto", color: col, whiteSpace: "nowrap" }}>{v}</b>
        </Abs>
      ))}
      <Abs x={296} y={352} w={296} h={10} style={{ background: "#1E293B", borderRadius: 99, overflow: "hidden" }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(90deg, ${C.em}, ${C.blue})`,
            transformOrigin: "left center",
            transform: `scaleX(${0.78 * easeOut(seg(t, a + 600, a + 1500))})`,
          }}
        />
      </Abs>
      <Abs x={296} y={370} w={296} style={{ fontFamily: FONT, fontSize: 11.5, color: C.mute }}>
        Fuerza de la señal: <b style={{ color: "#E2E8F0" }}>78%</b>
      </Abs>
    </div>
  );
}

function ActivatedBadge({ t, a }: { t: number; a: number }) {
  const p = easeOut(seg(t, a, a + 500));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: p, transform: `translate3d(${(1 - p) * 20}px, 0, 0)` }}>
      <Abs
        x={624}
        y={112}
        w={300}
        style={{
          background: "rgba(6,40,32,.96)",
          border: `2px solid ${C.em}`,
          borderRadius: 12,
          padding: "12px 14px",
          fontFamily: FONT,
          color: "#ECFDF5",
          fontSize: 13,
          lineHeight: 1.45,
          boxShadow: "0 0 34px rgba(36,211,169,.35)",
        }}
      >
        <div style={{ color: C.em, fontWeight: 900, fontSize: 14, marginBottom: 4 }}>✓ Activado</div>
        El archivo <b>.lic</b> se creó solo en <b style={{ fontFamily: MONO }}>MQL4/Files</b>. Tus demás gráficos ya abren
        activados automáticamente <b>(gráficos ilimitados en tus 3 cuentas)</b>.
      </Abs>
    </div>
  );
}

/* ───────────────────────── Teclas ───────────────────────── */

interface KeyDef {
  label: string;
  sub?: string;
  at: number;
  w?: number;
  tone?: "em" | "blue" | "red";
  crossed?: boolean;
}

function Keycap({ k, t }: { k: KeyDef; t: number }) {
  const active = t >= k.at;
  const pressP = seg(t, k.at, k.at + 120) * (1 - seg(t, k.at + 380, k.at + 520));
  const col = k.tone === "red" ? C.red : k.tone === "blue" ? C.blue : C.em;
  return (
    <div
      style={{
        position: "relative",
        width: k.w || 86,
        height: 80,
        borderRadius: 14,
        background: active ? (k.tone === "red" ? "#2A1215" : "#0D2A24") : "#1B2333",
        border: `2px solid ${active ? col : "#33415A"}`,
        boxShadow: active
          ? `0 ${5 - pressP * 3}px 0 ${k.tone === "red" ? "#5B1D22" : "#0A4D3D"}, 0 0 28px ${col}66`
          : "0 5px 0 #0B1220",
        transform: `translate3d(0, ${pressP * 3}px, 0)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        color: active ? "#F8FAFC" : "#94A3B8",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{k.label}</span>
      {k.sub && <span style={{ fontSize: 12, marginTop: 6, fontWeight: 700, letterSpacing: 0.3 }}>{k.sub}</span>}
      {k.crossed && (
        <svg width="100%" height="100%" viewBox="0 0 86 80" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
          <line x1="10" y1="10" x2="76" y2="70" stroke={C.red} strokeWidth="5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

function KeyCombo({
  t,
  a,
  b,
  keys,
  y,
  caption,
}: {
  t: number;
  a: number;
  b: number;
  keys: KeyDef[];
  y: number;
  caption?: React.ReactNode;
}) {
  const pin = easeOut(seg(t, a, a + 260));
  const pout = easeOut(seg(t, b, b + 240));
  const o = pin * (1 - pout);
  if (o <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        display: "flex",
        justifyContent: "center",
        opacity: o,
        transform: `translate3d(0, ${(1 - pin) * 18}px, 0) scale(${0.94 + 0.06 * pin})`,
        zIndex: 30,
      }}
    >
      <div
        style={{
          background: "rgba(8,12,20,.92)",
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "16px 22px",
          boxShadow: "0 20px 60px rgba(0,0,0,.6)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {keys.map((k, i) => (
            <React.Fragment key={k.label + i}>
              {i > 0 && <span style={{ color: "#64748B", fontSize: 28, fontWeight: 800, fontFamily: FONT }}>+</span>}
              <Keycap k={k} t={t} />
            </React.Fragment>
          ))}
        </div>
        {caption && (
          <div style={{ fontFamily: FONT, color: "#E2E8F0", fontSize: 14, fontWeight: 700, textAlign: "center" }}>{caption}</div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Escenas WINDOWS ───────────────────────── */

function WinScene1({ t, os }: SceneProps) {
  const extracted = t >= 5000;
  return (
    <>
      <BrowserChrome os={os} downloaded={t >= 2300} />
      <CuentaPage
        os={os}
        s={{ t, dlPressed: between(t, 1400, 1650), pulse: t < 1500 ? "dl" : null }}
      />
      {/* barra de descargas */}
      <Layer t={t} a={1700}>
        <Abs
          x={BR.x + 1}
          y={456}
          w={BR.w - 2}
          h={39}
          style={{ background: "#151D2B", borderTop: "1px solid #2A3445", borderRadius: "0 0 8px 8px" }}
        />
        <Abs
          x={52}
          y={462}
          w={300}
          h={28}
          style={{
            background: "#1E293B",
            border: `1px solid ${t >= 2300 ? C.em : "#334155"}`,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 10px",
            fontFamily: FONT,
            fontSize: 12,
            color: "#E2E8F0",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <FileIcon kind="zip" size={16} />
          <span>Legion_SuperPanel_v3_15_MT4.zip</span>
          <span style={{ marginLeft: "auto", color: t >= 2300 ? C.em : C.mute, fontSize: 11 }}>
            {t >= 2300 ? "✓ Listo" : `${Math.round(seg(t, 1700, 2300) * 100)}%`}
          </span>
        </Abs>
        <Abs x={52} y={488} w={300} h={2} style={{ background: "#0B1220" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              background: C.em,
              transformOrigin: "left",
              transform: `scaleX(${seg(t, 1700, 2300)})`,
            }}
          />
        </Abs>
      </Layer>
      {/* Explorador de Windows */}
      <Layer t={t} a={2900}>
        <Frame
          os="win"
          x={330}
          y={140}
          w={570}
          h={325}
          title={extracted ? "Descargas › Legion_SuperPanel_v3_15_MT4" : "Descargas › Legion_SuperPanel_v3_15_MT4.zip"}
        />
        <Abs
          x={331}
          y={168}
          w={568}
          h={34}
          style={{
            background: "#131B29",
            borderBottom: "1px solid #24324A",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 12px",
            fontFamily: FONT,
            fontSize: 12,
            color: "#CBD5E1",
          }}
        >
          <span>＋ Nuevo</span>
          <span>✂</span>
          <span>⧉</span>
          <span>⇅ Ordenar</span>
          <span>☰ Ver</span>
        </Abs>
        <Btn
          t={t}
          x={762}
          y={173}
          w={128}
          h={24}
          size={12}
          variant={extracted ? "ghost" : "em"}
          label={extracted ? "✓ Extraído" : "📦 Extraer todo"}
          pressed={between(t, 3900, 4100)}
          pulse={between(t, 3300, 3900)}
        />
        <Abs
          x={342}
          y={208}
          w={546}
          h={22}
          style={{
            background: "#0B1220",
            border: "1px solid #24324A",
            borderRadius: 5,
            fontFamily: FONT,
            fontSize: 11.5,
            color: "#94A3B8",
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          Este equipo › Descargas › {extracted ? "Legion_SuperPanel_v3_15_MT4" : "Legion_SuperPanel_v3_15_MT4.zip"}
        </Abs>
        <Abs x={352} y={236} w={530} style={{ display: "flex", fontFamily: FONT, fontSize: 11, color: "#64748B" }}>
          <span style={{ flex: 1 }}>Nombre</span>
          <span>Tipo</span>
        </Abs>
        <FileRow
          x={342}
          y={252}
          w={546}
          h={32}
          kind="ex4"
          name={FILE_EX4}
          meta="Archivo EX4 · 412 KB"
          hl={t >= 6200}
          fresh={extracted && t < 6200}
        />
        <FileRow x={342} y={286} w={546} h={32} kind="html" name="MANUAL_WINDOWS.html" meta="Documento HTML" />
        <FileRow x={342} y={320} w={546} h={32} kind="html" name="MANUAL_MAC.html" meta="Documento HTML" />
        {between(t, 3950, 5000) && (
          <Abs x={352} y={372} w={526} style={{ fontFamily: FONT, fontSize: 12, color: "#CBD5E1" }}>
            Extrayendo archivos…
            <div style={{ marginTop: 6, height: 6, background: "#1E293B", borderRadius: 99, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  background: C.em,
                  transformOrigin: "left",
                  transform: `scaleX(${seg(t, 3950, 4950)})`,
                }}
              />
            </div>
          </Abs>
        )}
      </Layer>
      <Layer t={t} a={6400}>
        <Callout x={500} y={372} w={360} text={<>👆 ¡Este es tu indicador! Archivo <span style={{ color: C.em }}>.ex4</span> listo</>} />
      </Layer>
    </>
  );
}

const WIN_ROOT = ["config", "history", "logs", "MQL4", "profiles", "templates"];
const WIN_MQL4 = ["Experts", "Files", "Images", "Include", "Indicators", "Libraries", "Logs", "Scripts"];

function WinScene2({ t, os }: SceneProps) {
  const level = t < 3250 ? 0 : t < 4250 ? 1 : 2;
  const dropped = t >= 6300;
  const rows = level === 0 ? WIN_ROOT : level === 1 ? WIN_MQL4 : [];
  const hlRow = level === 0 && between(t, 2900, 3250) ? 3 : level === 1 && between(t, 3900, 4250) ? 4 : -1;
  const addr =
    "C:\\Users\\Cliente\\AppData\\Roaming\\MetaQuotes\\Terminal\\8A3F1C2B" +
    (level >= 1 ? "\\MQL4" : "") +
    (level >= 2 ? "\\Indicators" : "");
  return (
    <>
      <MT4
        os={os}
        t={t}
        archivoHover={between(t, 800, 1000)}
        menuOpen={between(t, 1000, 2100)}
        menuHover={between(t, 1800, 2100)}
        indicHover={between(t, 7400, 7800)}
        ctxOpen={between(t, 7800, 8600)}
        ctxHover={between(t, 8300, 8600)}
        refreshed={t >= 8600}
        flash={between(t, 8600, 9400)}
      >
        <Layer t={t} a={10750}>
          <LicenseCard faint />
        </Layer>
      </MT4>
      {/* Explorador: carpeta de datos */}
      <Layer t={t} a={2200} b={6900} z={10}>
        <Frame os="win" x={300} y={112} w={610} h={370} title={level === 2 ? "Indicators" : level === 1 ? "MQL4" : "8A3F1C2B"} glow={level === 2} />
        <Abs
          x={312}
          y={148}
          w={586}
          h={24}
          style={{
            background: "#0B1220",
            border: "1px solid #24324A",
            borderRadius: 5,
            fontFamily: FONT,
            fontSize: 11,
            color: "#CBD5E1",
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {addr}
        </Abs>
        <Abs x={322} y={184} w={566} style={{ display: "flex", fontFamily: FONT, fontSize: 11, color: "#64748B" }}>
          <span style={{ flex: 1 }}>Nombre</span>
          <span>Fecha de modificación</span>
        </Abs>
        {rows.map((r, i) => (
          <FileRow
            key={r}
            x={312}
            y={208 + i * 30}
            w={586}
            kind="folder"
            name={r}
            meta="16/11/2026 17:40"
            hl={i === hlRow}
            fresh={(r === "MQL4" && level === 0) || (r === "Indicators" && level === 1)}
          />
        ))}
        {level === 2 && !dropped && (
          <Abs
            x={330}
            y={230}
            w={550}
            h={120}
            style={{
              border: `2px dashed ${between(t, 5200, 6300) ? C.em : "#334155"}`,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 700,
              color: between(t, 5200, 6300) ? C.em : "#64748B",
            }}
          >
            Suelta aquí tu archivo .ex4 (carpeta Indicators)
          </Abs>
        )}
        {level === 2 && dropped && (
          <FileRow x={312} y={208} w={586} h={32} kind="ex4" name={FILE_EX4} meta="✓ Copiado" fresh />
        )}
      </Layer>
      {/* mini ventana Descargas */}
      <Layer t={t} a={2300} b={6900} z={11}>
        <Frame os="win" x={36} y={320} w={250} h={170} title="Descargas › Legion…" />
        <FileRow x={42} y={360} w={238} h={32} kind="ex4" name={FILE_EX4.replace("_MT4", "…")} hl={between(t, 4900, 5200)} />
        <FileRow x={42} y={396} w={238} h={32} kind="html" name="MANUAL_WINDOWS.html" />
        <Abs x={46} y={438} w={230} style={{ fontFamily: FONT, fontSize: 11, color: C.mute }}>
          Arrastra el .ex4 a la ventana derecha →
        </Abs>
      </Layer>
      <Layer t={t} a={8700} b={9450} z={12}>
        <Callout x={266} y={238} w={300} arrow="left" text={<>¡Ahí está! Ahora arrástralo al gráfico 👉</>} />
      </Layer>
    </>
  );
}

function Scene3({ t, os }: SceneProps) {
  const typed = ACCOUNT.slice(0, Math.max(0, Math.min(8, Math.floor((t - 3600) / 140))));
  const saving = between(t, 5600, 6300);
  const saved = t >= 6300;
  const copied = t >= 7400;
  return (
    <>
      <Layer t={t} b={2500}>
        <MT4 os={os} t={t}>
          <LicenseCard selected={t >= 1420} />
          <Layer t={t} a={1500}>
            <Callout x={560} y={312} w={300} text={<>📋 Este es tu número de cuenta MT4</>} />
          </Layer>
        </MT4>
      </Layer>
      <Layer t={t} a={2500}>
        <BrowserChrome os={os} />
        <CuentaPage
          os={os}
          s={{
            t,
            acct: t >= 3600 ? typed : "",
            acctFocus: t >= 3350,
            saving,
            saved,
            codeReady: saved,
            copied,
            pulse: between(t, 4900, 5600) ? "save" : between(t, 6400, 7400) ? "copy" : null,
          }}
        />
        <Layer t={t} a={7700}>
          {os === "mac" ? (
            <Abs
              x={706}
              y={430}
              w={162}
              h={30}
              style={{
                background: C.yellow,
                color: "#1F1300",
                borderRadius: 8,
                fontFamily: FONT,
                fontSize: 11.5,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              Cero buscar la carpeta Files en Mac
            </Abs>
          ) : (
            <Abs
              x={706}
              y={430}
              w={162}
              h={30}
              style={{
                background: C.yellow,
                color: "#1F1300",
                borderRadius: 8,
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Opción A: la más fácil
            </Abs>
          )}
        </Layer>
        <Layer t={t} a={7500}>
          <Abs
            x={290}
            y={113}
            w={380}
            h={34}
            style={{
              background: "#05231C",
              border: `1px solid ${C.em}`,
              borderRadius: 99,
              color: "#D1FAE5",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 30px rgba(0,0,0,.5)",
              zIndex: 20,
            }}
          >
            ✓ Codigo_Licencia copiado al portapapeles
          </Abs>
        </Layer>
      </Layer>
    </>
  );
}

const INPUT_ROWS: [string, string][] = [
  ["Codigo_Licencia", ""],
  ["Mostrar_Panel", "true"],
  ["Tamano_Panel", "1.0"],
  ["Tema_Color", "Esmeralda"],
  ["Alertas_Push", "false"],
];

function PropsDialog({ t, os, editAt, pasteAt }: { t: number; os: OS; editAt: number; pasteAt: number }) {
  const inputsTab = t >= 1050;
  const editing = t >= editAt;
  const pasted = t >= pasteAt;
  const tabs = ["Común", "Parámetros de entrada (Inputs)", "Colores", "Visualización"];
  const tabX = [232, 302, 520, 594];
  const tabW = [66, 214, 70, 98];
  return (
    <>
      <Frame os={os} dark={false} x={220} y={64} w={520} h={410} title={`Indicador personalizado - ${IND_NAME}`} />
      {tabs.map((tb, i) => {
        const active = inputsTab ? i === 1 : i === 0;
        return (
          <Abs
            key={tb}
            x={tabX[i]}
            y={100}
            w={tabW[i]}
            h={26}
            style={{
              background: active ? "#FFFFFF" : "#E4E4E4",
              border: "1px solid #B5B5B5",
              borderBottom: active ? "1px solid #fff" : "1px solid #B5B5B5",
              fontFamily: FONT,
              fontSize: 12,
              color: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: active ? 700 : 400,
              whiteSpace: "nowrap",
              boxShadow: i === 1 && between(t, 300, 1050) ? `0 0 0 3px rgba(56,189,248,.6)` : "none",
            }}
          >
            {tb}
          </Abs>
        );
      })}
      <Abs x={232} y={125} w={496} h={290} style={{ background: "#fff", border: "1px solid #B5B5B5" }} />
      {!inputsTab ? (
        <Abs x={248} y={140} w={460} style={{ fontFamily: FONT, fontSize: 12.5, color: "#222", lineHeight: 2.1 }}>
          <div>☑ Permitir trading algorítmico</div>
          <div>☐ Permitir importar DLL</div>
          <div>☑ Permitir modificar configuración de señales</div>
        </Abs>
      ) : (
        <>
          <Abs
            x={236}
            y={130}
            w={488}
            h={24}
            style={{ display: "flex", background: "#F1F1F1", borderBottom: "1px solid #CCC", fontFamily: FONT, fontSize: 12, color: "#333", alignItems: "center" }}
          >
            <span style={{ width: 234, paddingLeft: 10 }}>Variable</span>
            <span style={{ paddingLeft: 10 }}>Valor</span>
          </Abs>
          {INPUT_ROWS.map(([k, v], i) => {
            const first = i === 0;
            const val = first ? (pasted ? LIC_CODE : "") : v;
            return (
              <Abs
                key={k}
                x={236}
                y={160 + i * 30}
                w={488}
                h={30}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #EEE",
                  background: first ? (editing ? "#E8F4FF" : between(t, 1600, editAt) ? "#F3F9FF" : "#fff") : "#fff",
                  fontFamily: FONT,
                  fontSize: 12.5,
                  color: "#111",
                }}
              >
                <span style={{ width: 234, paddingLeft: 10, display: "flex", gap: 6, alignItems: "center", fontWeight: first ? 700 : 400 }}>
                  <span style={{ color: "#2563EB", fontSize: 10 }}>ab</span> {k}
                </span>
                <span
                  style={{
                    flex: 1,
                    height: 24,
                    marginRight: 4,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                    fontFamily: first ? MONO : FONT,
                    fontWeight: first && pasted ? 700 : 400,
                    color: first && pasted ? "#065F46" : "#111",
                    border: first && editing ? `2px solid ${pasted ? C.em : "#2563EB"}` : "2px solid transparent",
                    background: first && pasted ? "rgba(36,211,169,.14)" : "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {val}
                  {first && editing && !pasted && <span className="lgt-caret" style={{ color: "#111" }}>|</span>}
                </span>
              </Abs>
            );
          })}
        </>
      )}
      <Abs
        x={236}
        y={428}
        w={100}
        h={28}
        style={{ background: "#E9E9E9", border: "1px solid #ADADAD", fontFamily: FONT, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", color: "#111" }}
      >
        Restablecer
      </Abs>
      <Abs
        x={528}
        y={428}
        w={96}
        h={28}
        style={{
          background: pasted ? "#DFF7EF" : "#E9E9E9",
          border: `1px solid ${pasted ? C.em : "#ADADAD"}`,
          boxShadow: pasted ? "0 0 0 3px rgba(36,211,169,.35)" : "none",
          fontFamily: FONT,
          fontSize: 12.5,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#111",
        }}
      >
        Aceptar
      </Abs>
      <Abs
        x={632}
        y={428}
        w={96}
        h={28}
        style={{ background: "#E9E9E9", border: "1px solid #ADADAD", fontFamily: FONT, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", color: "#111" }}
      >
        Cancelar
      </Abs>
    </>
  );
}

function WinScene4({ t, os }: SceneProps) {
  const closeAt = 5400;
  return (
    <>
      <MT4 os={os} t={t} refreshed chartGlow={easeOut(seg(t, 5600, 6200)) * (0.6 + 0.4 * Math.sin(t / 260))}>
        <Layer t={t} b={closeAt}>
          <LicenseCard />
        </Layer>
        {t >= 5700 && <Dashboard t={t} a={5700} />}
        {t >= 6200 && <ActivatedBadge t={t} a={6200} />}
      </MT4>
      <Layer t={t} b={closeAt} z={10}>
        <div style={{ position: "absolute", inset: 0, transform: "translate3d(0, 20px, 0)" }}>
          <PropsDialog t={t} os={os} editAt={2180} pasteAt={3300} />
        </div>
      </Layer>
      <KeyCombo
        t={t}
        a={2600}
        b={4300}
        y={272}
        keys={[
          { label: "Ctrl", sub: "control", at: 2950, w: 110 },
          { label: "V", sub: "pegar", at: 3200 },
        ]}
        caption={<>Pega tu código con <span style={{ color: C.em }}>Ctrl + V</span></>}
      />
    </>
  );
}

/* ───────────────────────── Escenas MAC ───────────────────────── */

function MacFinderChrome({
  x,
  y,
  w,
  h,
  title,
  side = 140,
  active = "Descargas",
  glow = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  side?: number;
  active?: string;
  glow?: boolean;
}) {
  const items = ["AirDrop", "Recientes", "Aplicaciones", "Escritorio", "Documentos", "Descargas"];
  return (
    <>
      <Abs
        x={x}
        y={y}
        w={w}
        h={h}
        style={{
          background: "#1C1F26",
          borderRadius: 11,
          border: `1px solid ${glow ? C.em : "#3A3F4B"}`,
          boxShadow: glow ? "0 0 0 3px rgba(36,211,169,.25), 0 24px 60px rgba(0,0,0,.55)" : "0 24px 60px rgba(0,0,0,.55)",
          overflow: "hidden",
        }}
      />
      {side > 0 && <Abs x={x + 1} y={y + 1} w={side} h={h - 2} style={{ background: "#23262E", borderRadius: "10px 0 0 10px" }} />}
      <Abs x={x + 14} y={y + 14} w={60} h={14}>
        <TrafficLights />
      </Abs>
      {side > 0 && (
      <Abs x={x + 12} y={y + 42} w={side - 20} style={{ fontFamily: FONT, fontSize: 11.5, color: "#9CA3AF", lineHeight: "24px" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6B7280" }}>Favoritos</div>
        {items.map((it) => (
          <div
            key={it}
            style={{
              color: it === active ? "#fff" : "#C9CED6",
              background: it === active ? "rgba(255,255,255,.12)" : "transparent",
              borderRadius: 5,
              paddingLeft: 6,
              whiteSpace: "nowrap",
            }}
          >
            {it === "Descargas" ? "⤓ " : "▢ "}
            {it}
          </div>
        ))}
      </Abs>
      )}
      <Abs
        x={x + Math.max(side, 76) + 14}
        y={y + 10}
        w={w - Math.max(side, 76) - 28}
        h={26}
        style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT, fontSize: 13, color: "#E5E7EB" }}
      >
        <span style={{ color: "#6B7280" }}>‹ ›</span>
        <b style={{ whiteSpace: "nowrap" }}>{title}</b>
      </Abs>
    </>
  );
}

function MacScene1({ t, os }: SceneProps) {
  const copied = t >= 5800;
  return (
    <>
      <BrowserChrome os={os} downloaded={t >= 1900} />
      <CuentaPage
        os={os}
        s={{
          t,
          dlPressed: between(t, 1400, 1650),
          macCopied: copied,
          pulse: t < 1500 ? "dl" : between(t, 4800, 5800) ? "mac" : null,
        }}
      />
      <Layer t={t} a={2200}>
        <MacFinderChrome x={480} y={150} w={420} h={300} title="Descargas" side={120} />
        <Abs x={612} y={196} w={276} style={{ display: "flex", fontFamily: FONT, fontSize: 11, color: "#6B7280" }}>
          <span style={{ flex: 1 }}>Nombre</span>
          <span>Clase</span>
        </Abs>
        <FileRow x={604} y={216} w={290} kind="ex4" name={FILE_EX4} hl={between(t, 2700, 5000)} fresh={t >= 5000} />
        <FileRow x={604} y={248} w={290} kind="html" name="MANUAL_MAC.html" />
        <FileRow x={604} y={280} w={290} kind="html" name="MANUAL_WINDOWS.html" />
        <Abs x={612} y={322} w={276} style={{ fontFamily: FONT, fontSize: 11.5, color: C.mute, lineHeight: 1.4 }}>
          Safari descomprimió el ZIP automáticamente en tu carpeta Descargas.
        </Abs>
      </Layer>
      <Layer t={t} a={3000} b={5000}>
        <Callout x={600} y={384} w={290} text={<>✓ Tu archivo .ex4 ya está descomprimido en Descargas</>} />
      </Layer>
      <Layer t={t} a={5900}>
        <Abs
          x={290}
          y={113}
          w={380}
          h={34}
          style={{
            background: "#062033",
            border: `1px solid ${C.blue}`,
            borderRadius: 99,
            color: "#E0F2FE",
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,.5)",
          }}
        >
          ✓ Ruta de Indicators copiada al portapapeles
        </Abs>
      </Layer>
    </>
  );
}

function MacScene2({ t, os }: SceneProps) {
  const atIndicators = t >= 3900;
  const dropped = t >= 6200;
  const pasted = t >= 2900;
  return (
    <>
      <Layer t={t} b={6900}>
        <MacFinderChrome
          x={60}
          y={40}
          w={860}
          h={440}
          title={atIndicators ? "Indicators" : "Descargas"}
          side={150}
          active={atIndicators ? "" : "Descargas"}
          glow={atIndicators && between(t, 4900, 6400)}
        />
        <Abs x={224} y={96} w={680} style={{ display: "flex", fontFamily: FONT, fontSize: 11, color: "#6B7280" }}>
          <span style={{ flex: 1 }}>Nombre</span>
          <span style={{ width: 170 }}>Fecha de modificación</span>
          <span style={{ width: 80 }}>Clase</span>
        </Abs>
        {!atIndicators && (
          <>
            <FileRow x={214} y={114} w={696} kind="ex4" name={FILE_EX4} meta="Hoy 17:41" />
            <FileRow x={214} y={146} w={696} kind="html" name="MANUAL_MAC.html" meta="Hoy 17:41" />
          </>
        )}
        {atIndicators && !dropped && (
          <Abs
            x={240}
            y={130}
            w={650}
            h={150}
            style={{
              border: `2px dashed ${between(t, 4900, 6200) ? C.em : "#3A3F4B"}`,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 700,
              color: between(t, 4900, 6200) ? C.em : "#6B7280",
            }}
          >
            Suelta aquí solo el archivo .ex4
          </Abs>
        )}
        {atIndicators && dropped && (
          <FileRow x={214} y={114} w={696} h={32} kind="ex4" name={FILE_EX4} meta="✓ Copiado" fresh />
        )}
        {/* barra de ruta */}
        <Abs
          x={211}
          y={452}
          w={708}
          h={27}
          style={{
            borderTop: "1px solid #2E323B",
            fontFamily: FONT,
            fontSize: 11,
            color: "#9CA3AF",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            whiteSpace: "nowrap",
          }}
        >
          {atIndicators ? "drive_c › Program Files (x86) › MetaTrader 4 › MQL4 › Indicators" : "Macintosh HD › Usuarios › cliente › Descargas"}
        </Abs>
      </Layer>

      {/* Cuadro "Ir a la carpeta" */}
      <Layer t={t} a={1900} b={3850} z={10}>
        <Abs
          x={270}
          y={84}
          w={420}
          h={178}
          style={{
            background: "#2A2D35",
            border: "1px solid #474C58",
            borderRadius: 12,
            boxShadow: "0 24px 60px rgba(0,0,0,.6)",
          }}
        />
        <Abs x={290} y={100} w={380} style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "#F3F4F6" }}>
          Ir a la carpeta:
        </Abs>
        <Abs
          x={290}
          y={126}
          w={380}
          h={66}
          style={{
            background: "#16181D",
            border: `2px solid ${pasted ? C.blue : "#3B82F6"}`,
            borderRadius: 7,
            padding: "6px 8px",
            fontFamily: MONO,
            fontSize: 10.5,
            lineHeight: 1.45,
            color: "#E0F2FE",
            wordBreak: "break-all",
          }}
        >
          {pasted ? MAC_PATH : ""}
          {!pasted && <span className="lgt-caret">|</span>}
        </Abs>
        <Abs
          x={520}
          y={214}
          w={72}
          h={28}
          style={{ background: "#3A3E48", borderRadius: 7, color: "#E5E7EB", fontFamily: FONT, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          Cancelar
        </Abs>
        <Abs
          x={600}
          y={214}
          w={70}
          h={28}
          style={{
            background: "#2563EB",
            borderRadius: 7,
            color: "#fff",
            fontFamily: FONT,
            fontSize: 12.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${between(t, 3600, 3800) ? 0.94 : 1})`,
          }}
        >
          Ir
        </Abs>
      </Layer>

      {/* mini Finder Descargas */}
      <Layer t={t} a={4100} b={6900} z={11}>
        <MacFinderChrome x={90} y={290} w={340} h={170} title="Descargas" side={0} active="" />
        <FileRow x={100} y={334} w={320} h={32} kind="ex4" name={FILE_EX4} hl={between(t, 4700, 5100)} />
        <FileRow x={100} y={368} w={320} h={32} kind="html" name="MANUAL_MAC.html" />
        <Abs x={110} y={412} w={300} style={{ fontFamily: FONT, fontSize: 11, color: C.mute }}>
          Arrastra solo el .ex4 hacia la ventana Indicators ↗
        </Abs>
      </Layer>

      {/* MT4 en Mac */}
      <Layer t={t} a={6900}>
        <MT4
          os={os}
          t={t}
          indicHover={between(t, 7500, 7900)}
          ctxOpen={between(t, 7900, 8700)}
          ctxHover={between(t, 8400, 8700)}
          refreshed={t >= 8700}
          flash={between(t, 8700, 9500)}
        >
          <Layer t={t} a={10850}>
            <LicenseCard faint />
          </Layer>
        </MT4>
      </Layer>
      <Layer t={t} a={8800} b={9550} z={12}>
        <Callout x={266} y={238} w={300} arrow="left" text={<>¡Ahí está! Arrástralo al gráfico 👉</>} />
      </Layer>

      {/* Aviso preventivo */}
      <Layer t={t} a={4200} z={25}>
        <Abs
          x={130}
          y={494}
          w={700}
          h={38}
          style={{
            background: "rgba(66,44,4,.96)",
            border: `2px solid ${C.amber}`,
            borderRadius: 10,
            color: "#FEF3C7",
            fontFamily: FONT,
            fontSize: 13.5,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            whiteSpace: "nowrap",
            boxShadow: "0 10px 30px rgba(0,0,0,.5)",
          }}
        >
          ⚠️ Importante: arrastra solo el archivo .ex4, nunca reemplaces toda la carpeta MQL4.
        </Abs>
      </Layer>

      {/* Teclas */}
      <KeyCombo
        t={t}
        a={200}
        b={1900}
        y={200}
        keys={[
          { label: "⌘", sub: "Cmd", at: 400 },
          { label: "⇧", sub: "Shift", at: 800, w: 100 },
          { label: "G", sub: "", at: 1200 },
        ]}
        caption={<>Abre «Ir a la carpeta» en Finder</>}
      />
      <KeyCombo
        t={t}
        a={2400}
        b={3250}
        y={290}
        keys={[
          { label: "⌘", sub: "Cmd", at: 2650 },
          { label: "V", sub: "pegar", at: 2850 },
        ]}
        caption={<>Pega la ruta copiada</>}
      />
      <KeyCombo t={t} a={3300} b={3850} y={290} keys={[{ label: "↵", sub: "Enter", at: 3550, w: 120 }]} />
    </>
  );
}

function MacScene4({ t, os }: SceneProps) {
  const closeAt = 6600;
  return (
    <>
      <MT4 os={os} t={t} refreshed chartGlow={easeOut(seg(t, 6800, 7400)) * (0.6 + 0.4 * Math.sin(t / 260))}>
        <Layer t={t} b={closeAt}>
          <LicenseCard />
        </Layer>
        {t >= 6900 && <Dashboard t={t} a={6900} />}
        {t >= 7400 && <ActivatedBadge t={t} a={7400} />}
      </MT4>
      <Layer t={t} b={closeAt} z={10}>
        <div style={{ position: "absolute", inset: 0, transform: "translate3d(0, 20px, 0)" }}>
          <PropsDialog t={t} os={os} editAt={2180} pasteAt={4300} />
        </div>
      </Layer>
      {/* Alerta gigante de teclado Mac */}
      <Layer t={t} a={2500} b={5700} z={30} rise={20}>
        <Abs
          x={120}
          y={150}
          w={720}
          h={300}
          style={{
            background: "rgba(6,9,15,.96)",
            border: `2px solid ${C.em}`,
            borderRadius: 20,
            boxShadow: "0 30px 80px rgba(0,0,0,.7), 0 0 40px rgba(36,211,169,.25)",
          }}
        />
        <Abs x={140} y={166} w={680} style={{ textAlign: "center", fontFamily: FONT, fontSize: 18, fontWeight: 900, color: "#F8FAFC", lineHeight: 1.3 }}>
          En MT4 sobre Mac se pega con <span style={{ color: C.em }}>CONTROL ⌃ + V</span>,{" "}
          <span style={{ color: C.red }}>NO con Comando ⌘ + V</span>
        </Abs>
        <Abs x={140} y={222} w={680} h={92} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Keycap k={{ label: "fn", sub: "", at: 1e9, w: 70 }} t={t} />
          <Keycap k={{ label: "⌃", sub: "control", at: 3600, w: 104 }} t={t} />
          <Keycap k={{ label: "⌥", sub: "option", at: 1e9, w: 84 }} t={t} />
          <Keycap k={{ label: "⌘", sub: "command", at: 2900, w: 104, tone: "red", crossed: true }} t={t} />
          <span style={{ width: 24 }} />
          <Keycap k={{ label: "V", sub: "pegar", at: 3900, w: 86 }} t={t} />
        </Abs>
        <Abs x={160} y={334} w={640} h={44} style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <div
            style={{
              flex: 1,
              background: "rgba(36,211,169,.16)",
              border: `2px solid ${C.em}`,
              borderRadius: 12,
              color: "#D1FAE5",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
          >
            ✓ SÍ: control ⌃ + V
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(248,113,113,.14)",
              border: `2px solid ${C.red}`,
              borderRadius: 12,
              color: "#FEE2E2",
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
          >
            ✗ NO: Comando ⌘ + V
          </div>
        </Abs>
        <Abs x={160} y={392} w={640} style={{ textAlign: "center", fontFamily: FONT, fontSize: 13, color: C.mute }}>
          La tecla <b style={{ color: "#E2E8F0" }}>control ⌃</b> está abajo a la izquierda de tu teclado Mac.
        </Abs>
      </Layer>
    </>
  );
}

/* ───────────────────────── Guion de escenas ───────────────────────── */

const SCENES: Record<OS, SceneDef[]> = {
  win: [
    {
      title: "Descarga tu paquete desde /cuenta",
      dur: 10000,
      sub: "Paso 1: En tu panel legionai.iareal.net/cuenta, descarga tu paquete ZIP y extrae el archivo .ex4.",
      voice:
        "Paso 1: En tu panel legionai punto iareal punto net, diagonal cuenta, descarga tu paquete ZIP y extrae el archivo punto ex4.",
      path: [
        [0, 520, 420],
        [1200, 254, 256],
        [1600, 254, 256],
        [2400, 197, 476],
        [2800, 197, 476],
        [3700, 826, 185],
        [4200, 826, 185],
        [5300, 826, 185],
        [6200, 520, 268],
        [10000, 530, 272],
      ],
      clicks: [
        [1400, "l"],
        [2600, "l"],
        [3900, "l"],
      ],
      Render: WinScene1,
    },
    {
      title: "Mete el indicador en MetaTrader 4",
      dur: 16500,
      sub: "Paso 2: En MetaTrader 4 abre Archivo › Abrir carpeta de datos, entra a MQL4, luego a Indicators y pega ahí el indicador. Después dale clic derecho a Indicadores › Actualizar y arrástralo al gráfico.",
      voice:
        "Paso 2: En MetaTrader 4 abre Archivo, Abrir carpeta de datos, entra a MQL4, luego a Indicators y pega ahí el indicador. Después dale clic derecho a Indicadores, Actualizar, y arrástralo al gráfico.",
      path: [
        [0, 520, 320],
        [900, 58, 63],
        [1300, 58, 63],
        [1800, 130, 234],
        [2200, 130, 234],
        [2900, 420, 313],
        [3300, 420, 313],
        [3900, 420, 343],
        [4300, 420, 343],
        [4900, 150, 376],
        [5200, 150, 376],
        [6200, 600, 262],
        [6600, 600, 262],
        [7400, 100, 188],
        [7900, 100, 188],
        [8300, 180, 232],
        [8700, 180, 232],
        [9200, 150, 212],
        [9500, 150, 212],
        [10600, 590, 300],
        [16500, 600, 310],
      ],
      clicks: [
        [1000, "l"],
        [2000, "l"],
        [3050, "l"],
        [3200, "l"],
        [4050, "l"],
        [4200, "l"],
        [5100, "l"],
        [7800, "r"],
        [8500, "l"],
        [9400, "l"],
      ],
      drags: [
        { a: 5200, b: 6300, label: FILE_EX4 },
        { a: 9500, b: 10700, label: IND_NAME },
      ],
      Render: WinScene2,
    },
    {
      title: "Registra tu cuenta MT4 y copia tu Codigo_Licencia",
      dur: 10500,
      sub: "Paso 3: Copia tu número de cuenta de MetaTrader 4, guárdalo en tu panel web y presiona el botón negro «Copiar Codigo_Licencia» en la caja verde.",
      voice:
        "Paso 3: Copia tu número de cuenta de MetaTrader 4, guárdalo en tu panel web y presiona el botón negro Copiar Código Licencia en la caja verde.",
      path: [
        [0, 720, 440],
        [1100, 600, 212],
        [2600, 600, 212],
        [3250, 680, 217],
        [4900, 690, 222],
        [5400, 680, 344],
        [6700, 680, 344],
        [7200, 598, 445],
        [7700, 598, 445],
        [10500, 620, 458],
      ],
      clicks: [
        [1300, "l"],
        [1420, "l"],
        [3350, "l"],
        [5550, "l"],
        [7400, "l"],
      ],
      carry: [{ a: 1700, b: 3300, label: `📋 ${ACCOUNT}` }],
      Render: Scene3,
    },
    {
      title: "Pégalo una sola vez en Inputs y listo",
      dur: 14600,
      sub: "Paso 4: En Parámetros de entrada haz doble clic en Codigo_Licencia, pega con Ctrl + V y dale Aceptar. ¡Listo! Todos tus gráficos quedan activados automáticamente.",
      voice:
        "Paso 4: En Parámetros de entrada haz doble clic en Código Licencia, pega con Control V y dale Aceptar. Listo, todos tus gráficos quedan activados automáticamente.",
      path: [
        [0, 700, 480],
        [900, 409, 133],
        [1200, 409, 133],
        [1900, 596, 195],
        [4600, 596, 195],
        [5200, 576, 462],
        [5600, 576, 462],
        [6600, 900, 470],
        [14600, 900, 470],
      ],
      clicks: [
        [1050, "l"],
        [2050, "l"],
        [2180, "l"],
        [5300, "l"],
      ],
      Render: WinScene4,
    },
  ],
  mac: [
    {
      title: "Descarga tu ZIP y copia la ruta directa de Mac",
      dur: 9500,
      sub: "Paso 1 en Mac: Descarga tu paquete ZIP y presiona el botón «Copiar ruta Indicators (Mac)» en tu panel.",
      voice: "Paso 1 en Mac: Descarga tu paquete ZIP y presiona el botón Copiar ruta Indicators Mac en tu panel.",
      path: [
        [0, 520, 420],
        [1200, 254, 256],
        [1600, 254, 256],
        [2700, 720, 231],
        [4600, 720, 231],
        [5500, 254, 320],
        [6100, 254, 320],
        [9500, 300, 345],
      ],
      clicks: [
        [1400, "l"],
        [5800, "l"],
      ],
      Render: MacScene1,
    },
    {
      title: "Abre la carpeta oculta en Finder con ⌘ + ⇧ + G",
      dur: 17500,
      sub: "Paso 2: Abre Finder, presiona Cmd ⌘ + Shift ⇧ + G, pega la ruta con Cmd ⌘ + V y mete ahí el archivo .ex4. Luego en MetaTrader 4 dale Actualizar a Indicadores y arrástralo al gráfico.",
      voice:
        "Paso 2: Abre Finder, presiona Comando más Shift más G, pega la ruta con Comando V y mete ahí el archivo punto ex4. Luego en MetaTrader 4 dale Actualizar a Indicadores y arrástralo al gráfico.",
      path: [
        [0, 760, 140],
        [2000, 760, 140],
        [2400, 480, 160],
        [3300, 480, 160],
        [3500, 636, 228],
        [3900, 636, 228],
        [4700, 250, 350],
        [5000, 250, 350],
        [6100, 600, 200],
        [6600, 600, 200],
        [7500, 100, 188],
        [8000, 100, 188],
        [8400, 180, 232],
        [8800, 180, 232],
        [9300, 150, 212],
        [9600, 150, 212],
        [10700, 590, 300],
        [17500, 600, 310],
      ],
      clicks: [
        [2450, "l"],
        [3650, "l"],
        [4950, "l"],
        [7900, "r"],
        [8600, "l"],
        [9500, "l"],
      ],
      drags: [
        { a: 5000, b: 6200, label: FILE_EX4 },
        { a: 9600, b: 10800, label: IND_NAME },
      ],
      Render: MacScene2,
    },
    {
      title: "Guarda tu cuenta MT4 y copia tu Codigo_Licencia",
      dur: 10500,
      sub: "Paso 3: Guarda tu número de cuenta en el panel web y haz clic en «Copiar Codigo_Licencia» dentro de la caja verde. ¡Cero buscar la carpeta Files en Mac!",
      voice:
        "Paso 3: Guarda tu número de cuenta en el panel web y haz clic en Copiar Código Licencia dentro de la caja verde.",
      path: [
        [0, 720, 440],
        [1100, 600, 212],
        [2600, 600, 212],
        [3250, 680, 217],
        [4900, 690, 222],
        [5400, 680, 344],
        [6700, 680, 344],
        [7200, 598, 445],
        [7700, 598, 445],
        [10500, 620, 458],
      ],
      clicks: [
        [1300, "l"],
        [1420, "l"],
        [3350, "l"],
        [5550, "l"],
        [7400, "l"],
      ],
      carry: [{ a: 1700, b: 3300, label: `📋 ${ACCOUNT}` }],
      Render: Scene3,
    },
    {
      title: "Pega en MT4 Mac con CONTROL ⌃ + V (no ⌘ + V)",
      dur: 12500,
      sub: "Paso 4 clave en Mac: En Codigo_Licencia pega presionando control ⌃ + V (no Comando ⌘ + V) y dale Aceptar. Todos tus gráficos quedarán activados solos.",
      voice:
        "Paso 4, clave en Mac: En Código Licencia pega presionando la tecla Control más V, no Comando V, y dale Aceptar. Todos tus gráficos quedarán activados solos.",
      path: [
        [0, 700, 480],
        [900, 409, 133],
        [1200, 409, 133],
        [1900, 596, 195],
        [2400, 596, 195],
        [2600, 900, 480],
        [5700, 900, 480],
        [6300, 576, 462],
        [6700, 576, 462],
        [7600, 900, 470],
        [12500, 900, 470],
      ],
      clicks: [
        [1050, "l"],
        [2050, "l"],
        [2180, "l"],
        [6500, "l"],
      ],
      Render: MacScene4,
    },
  ],
};

/* ───────────────────────── Cursor gigante ───────────────────────── */

function CursorOverlay({ scene, t }: { scene: SceneDef; t: number }) {
  const { x, y } = cursorAt(scene.path, t);
  const lastClick = scene.clicks.filter(([ct]) => ct <= t).pop();
  const pressed = lastClick ? t - lastClick[0] < 160 : false;
  const drag = scene.drags?.find((d) => between(t, d.a, d.b));
  const carry = scene.carry?.find((d) => between(t, d.a, d.b));
  const chip = drag || carry;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, pointerEvents: "none" }}>
      {/* ondas de clic */}
      {scene.clicks.map(([ct, kind], i) => {
        const age = t - ct;
        if (age < 0 || age > 700) return null;
        const p = age / 700;
        const pos = cursorAt(scene.path, ct);
        const col = kind === "r" ? C.blue : C.em;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: pos.x - 30,
                top: pos.y - 30,
                width: 60,
                height: 60,
                borderRadius: 99,
                border: `3px solid ${col}`,
                opacity: 1 - p,
                transform: `scale(${0.3 + easeOut(p) * 1.6})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: pos.x - 16,
                top: pos.y - 16,
                width: 32,
                height: 32,
                borderRadius: 99,
                background: col,
                opacity: (1 - p) * 0.45,
                transform: `scale(${0.5 + easeOut(p)})`,
              }}
            />
            {kind === "r" && age < 520 && (
              <div
                style={{
                  position: "absolute",
                  left: pos.x + 24,
                  top: pos.y - 34,
                  background: C.blue,
                  color: "#04202F",
                  fontFamily: FONT,
                  fontWeight: 900,
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 6,
                  opacity: 1 - seg(age, 300, 520),
                  whiteSpace: "nowrap",
                }}
              >
                clic derecho
              </div>
            )}
          </React.Fragment>
        );
      })}
      {/* archivo arrastrado / dato copiado */}
      {chip && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate3d(${x + 26}px, ${y + 30}px, 0)`,
            background: drag ? "rgba(15,23,42,.92)" : C.yellow,
            color: drag ? "#E2E8F0" : "#1F1300",
            border: drag ? `2px solid ${C.em}` : "none",
            borderRadius: 8,
            padding: "5px 10px",
            fontFamily: drag ? FONT : MONO,
            fontWeight: 800,
            fontSize: 12.5,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 10px 26px rgba(0,0,0,.5)",
          }}
        >
          {drag && <FileIcon kind="ex4" size={16} />}
          {chip.label}
        </div>
      )}
      {/* halo + flecha */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate3d(${x}px, ${y}px, 0)`,
          willChange: "transform",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -42,
            top: -42,
            width: 84,
            height: 84,
            borderRadius: 99,
            background: "radial-gradient(circle, rgba(36,211,169,.42) 0%, rgba(56,189,248,.16) 45%, rgba(56,189,248,0) 70%)",
            transform: `scale(${pressed ? 0.8 : 1})`,
          }}
        />
        <svg
          width="40"
          height="52"
          viewBox="0 0 26 34"
          style={{
            position: "absolute",
            left: -3,
            top: -2,
            transform: `scale(${pressed ? 0.86 : 1})`,
            transformOrigin: "3px 2px",
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,.6))",
          }}
        >
          <path d="M2 1.5 L2 27 L8.6 20.8 L13.2 31.2 L18 29 L13.4 18.8 L22.5 18.8 Z" fill="#FFFFFF" stroke="#0B0F17" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/* ───────────────────────── Escenario escalado ───────────────────────── */

function Stage({ os, scene, t }: { os: OS; scene: SceneDef; t: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / STAGE_W);
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const R = scene.Render;
  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", background: "#000" }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <Desktop os={os} />
        <R t={t} os={os} />
        <CursorOverlay scene={scene} t={t} />
      </div>
    </div>
  );
}

/* ───────────────────────── Iconos de interfaz ───────────────────────── */

const WinLogo = () => (
  <svg width="18" height="18" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="0" y="0" width="6.4" height="6.4" fill="currentColor" />
    <rect x="7.6" y="0" width="6.4" height="6.4" fill="currentColor" />
    <rect x="0" y="7.6" width="6.4" height="6.4" fill="currentColor" />
    <rect x="7.6" y="7.6" width="6.4" height="6.4" fill="currentColor" />
  </svg>
);

const AppleLogo = () => (
  <svg width="17" height="20" viewBox="0 0 17 20" aria-hidden="true">
    <path
      fill="currentColor"
      d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.5 4.8 1.9 5.8 1 7.4c-1.9 3.2-.5 8 1.3 10.6.9 1.3 1.9 2.7 3.3 2.6 1.3-.1 1.8-.9 3.4-.9s2 .9 3.4.8c1.4 0 2.3-1.3 3.2-2.6 1-1.5 1.4-2.9 1.4-3-.1 0-2.9-1.1-2.9-4.3zM11.5 3c.7-.9 1.2-2 1.1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1.1 3 1.1.1 2.2-.6 2.9-1.4z"
    />
  </svg>
);

/* ───────────────────────── Estilos globales (scoped) ───────────────────────── */

const CSS = `
.lgt-root{--em:${C.em};--blue:${C.blue};}
.lgt-root *{box-sizing:border-box;}
.lgt-root button{font-family:${FONT};cursor:pointer;-webkit-tap-highlight-color:transparent;}
.lgt-root button:focus-visible,.lgt-root [tabindex]:focus-visible{outline:3px solid ${C.blue};outline-offset:2px;}
.lgt-caret{animation:lgt-blink 1s steps(1) infinite;margin-left:1px;color:${C.em};}
@keyframes lgt-blink{50%{opacity:0}}
.lgt-spin{width:14px;height:14px;border-radius:99px;border:2px solid rgba(255,255,255,.25);border-top-color:${C.em};display:inline-block;animation:lgt-rot .7s linear infinite;}
@keyframes lgt-rot{to{transform:rotate(360deg)}}
.lgt-ctrl{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 16px;border-radius:12px;border:1px solid ${C.border};background:${C.surf};color:${C.text};font-weight:700;font-size:14px;white-space:nowrap;transition:transform .15s ease,background-color .15s ease,border-color .15s ease;}
.lgt-ctrl:hover{border-color:#3B4C68;background:#162033;}
.lgt-ctrl:active{transform:scale(.97);}
.lgt-ctrl[aria-pressed="true"]{border-color:${C.em};color:#D1FAE5;background:rgba(36,211,169,.10);}
.lgt-ctrl:disabled{opacity:.45;cursor:not-allowed;}
.lgt-play{height:52px;padding:0 24px;font-size:16px;font-weight:900;background:linear-gradient(180deg,#2EE6B8,${C.em});color:#03241B;border:1px solid #5EF0C9;box-shadow:0 8px 28px rgba(36,211,169,.28);}
.lgt-play:hover{background:linear-gradient(180deg,#45F0C5,#27DDB1);border-color:#7AF5D6;}
.lgt-tab{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 16px;border-radius:14px;border:1px solid transparent;background:transparent;color:${C.mute};font-weight:800;font-size:15px;transition:background-color .2s ease,color .2s ease,border-color .2s ease;}
.lgt-tab[aria-selected="true"]{background:${C.surf};color:#F8FAFC;border-color:${C.em};box-shadow:0 0 0 3px rgba(36,211,169,.14);}
.lgt-tab .lgt-tab-sub{font-weight:600;font-size:12.5px;color:${C.mute};}
.lgt-chap{position:relative;height:100%;border:none;padding:0;background:transparent;}
.lgt-chap-track{position:absolute;left:0;right:0;top:50%;height:8px;margin-top:-4px;border-radius:99px;background:#1E293B;overflow:hidden;transition:height .15s ease;}
.lgt-chap:hover .lgt-chap-track{height:12px;margin-top:-6px;}
.lgt-chap-fill{position:absolute;inset:0;background:linear-gradient(90deg,${C.em},${C.blue});transform-origin:left center;}
.lgt-sub{font-weight:800;line-height:1.4;font-size:clamp(15px,2.15vw,23px);}
.lgt-sub span.lgt-sub-box{background:rgba(0,0,0,.78);padding:3px 10px;border-radius:6px;-webkit-box-decoration-break:clone;box-decoration-break:clone;}
.lgt-hide-sm{}
@media (max-width:640px){
  .lgt-hide-sm{display:none !important;}
  .lgt-ctrl{height:42px;padding:0 12px;font-size:13px;}
  .lgt-play{height:48px;padding:0 18px;font-size:15px;}
  .lgt-tab{padding:12px 10px;font-size:14px;flex-direction:column;gap:4px;}
}
@media (prefers-reduced-motion: reduce){
  .lgt-ctrl,.lgt-tab,.lgt-chap-track{transition:none;}
}
`;

/* ───────────────────────── Componente principal ───────────────────────── */

export default function TutorialInstalacionLegion() {
  const [os, setOs] = useState<OS>("win");
  const [step, setStep] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [auto, setAuto] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  /** MP3 propios en /public/tutorial-audio — siempre soportado en navegador. */
  const [voiceSupported] = useState(true);
  const [ended, setEnded] = useState(false);
  const [nonce, setNonce] = useState(0);

  const tRef = useRef(0);
  const stepRef = useRef(0);
  const holdRef = useRef(0);
  const osRef = useRef<OS>("win");
  const autoRef = useRef(true);
  const voiceOnRef = useRef(true);
  const speakingRef = useRef(false);
  const spokenRef = useRef("");
  const uttId = useRef(0);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopVoice = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
    }
    speakingRef.current = false;
  }, []);

  useEffect(() => {
    osRef.current = os;
  }, [os]);
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  useEffect(() => {
    return () => stopVoice();
  }, [stopVoice]);

  const scenes = SCENES[os];
  const scene = scenes[step];

  const goto = useCallback((s: number, time = 0) => {
    stepRef.current = s;
    tRef.current = time;
    holdRef.current = 0;
    setStep(s);
    setT(time);
    setEnded(false);
  }, []);

  /** Salto iniciado por el usuario: vuelve a narrar si empieza desde el inicio de la escena. */
  const jump = useCallback(
    (s: number, time = 0) => {
      goto(s, time);
      if (time === 0) setNonce((n) => n + 1);
    },
    [goto]
  );

  /* Bucle de animación — no avanza de paso mientras el locutor sigue hablando (hasta 20s). */
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const list = SCENES[osRef.current];
      const sc = list[stepRef.current];
      let nt = tRef.current + dt;
      if (nt >= sc.dur) {
        nt = sc.dur;
        tRef.current = nt;
        if (!autoRef.current) {
          setT(nt);
          setPlaying(false);
          return;
        }
        if (voiceOnRef.current && speakingRef.current && holdRef.current < 20000) {
          holdRef.current += dt;
          setT(nt);
          raf = requestAnimationFrame(loop);
          return;
        }
        if (stepRef.current < list.length - 1) {
          goto(stepRef.current + 1, 0);
          raf = requestAnimationFrame(loop);
          return;
        }
        setT(nt);
        setPlaying(false);
        setEnded(true);
        return;
      }
      tRef.current = nt;
      setT(nt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, goto]);

  /* Fallback speechSynthesis: cachear voz ES si hace falta */
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const pick = () => {
      const vs = synth.getVoices();
      voiceRef.current =
        vs.find((v) => v.lang === "es-MX") ||
        vs.find((v) => v.lang === "es-US") ||
        vs.find((v) => v.lang === "es-419") ||
        vs.find((v) => v.lang === "es-ES") ||
        vs.find((v) => v.lang.toLowerCase().startsWith("es")) ||
        null;
    };
    pick();
    synth.addEventListener?.("voiceschanged", pick);
    return () => {
      synth.removeEventListener?.("voiceschanged", pick);
    };
  }, []);

  /* Voz: MP3 reales por escena; fallback a speechSynthesis si play() falla */
  useEffect(() => {
    const key = `${os}-${step}-${nonce}`;
    if (!playing || !voiceOn) {
      stopVoice();
      spokenRef.current = "";
      return;
    }
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    stopVoice();

    const id = ++uttId.current;
    const markDone = () => {
      if (uttId.current === id) speakingRef.current = false;
    };

    const speakFallback = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        markDone();
        return;
      }
      try {
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(SCENES[os][step].voice);
        const v = voiceRef.current;
        u.lang = v?.lang || "es-MX";
        if (v) u.voice = v;
        u.rate = 1;
        u.pitch = 1;
        u.onend = markDone;
        u.onerror = markDone;
        speakingRef.current = true;
        synth.speak(u);
      } catch {
        markDone();
      }
    };

    try {
      const src = `/tutorial-audio/${os}-${step + 1}.mp3`;
      const audio = new Audio(src);
      audio.preload = "auto";
      audioRef.current = audio;
      speakingRef.current = true;
      audio.onended = markDone;
      audio.onerror = () => {
        markDone();
        speakFallback();
      };
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {
          stopVoice();
          spokenRef.current = key;
          speakFallback();
        });
      }
    } catch {
      speakFallback();
    }

    return () => {
      /* cleanup al cambiar paso/OS/pausa: el siguiente efecto o stopVoice corta el audio */
      if (uttId.current === id) {
        const audio = audioRef.current;
        if (audio) {
          audio.onended = null;
          audio.onerror = null;
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
          if (audioRef.current === audio) audioRef.current = null;
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
        }
        speakingRef.current = false;
      }
    };
  }, [os, step, playing, voiceOn, nonce, stopVoice]);

  const togglePlay = useCallback(() => {
    if (ended) {
      jump(0, 0);
      setPlaying(true);
      return;
    }
    if (!playing && tRef.current >= SCENES[osRef.current][stepRef.current].dur) {
      // escena terminada en modo manual: pasa a la siguiente
      const n = Math.min(stepRef.current + 1, SCENES[osRef.current].length - 1);
      jump(n, 0);
    }
    setPlaying((p) => !p);
  }, [ended, playing, jump]);

  const restart = useCallback(() => {
    jump(0, 0);
    setPlaying(true);
  }, [jump]);

  const prev = useCallback(() => {
    const s = stepRef.current;
    if (tRef.current > 1500) jump(s, 0);
    else jump(Math.max(0, s - 1), 0);
  }, [jump]);

  const next = useCallback(() => {
    const s = stepRef.current;
    if (s < SCENES[osRef.current].length - 1) jump(s + 1, 0);
  }, [jump]);

  const changeOs = useCallback(
    (o: OS) => {
      if (o === osRef.current) return;
      osRef.current = o;
      setOs(o);
      jump(0, 0);
    },
    [jump]
  );

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === " " || e.key === "k" || e.key === "K") {
      if (tag === "BUTTON") return;
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  };

  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const elapsed = scenes.slice(0, step).reduce((a, s) => a + s.dur, 0) + t;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const colonIdx = scene.sub.indexOf(":");
  const subHead = colonIdx > -1 ? scene.sub.slice(0, colonIdx + 1) : "";
  const subBody = colonIdx > -1 ? scene.sub.slice(colonIdx + 1) : scene.sub;
  const fresh = !playing && step === 0 && t === 0 && !ended;
  const sceneDone = !playing && t >= scene.dur && !ended;

  return (
    <section
      className="lgt-root"
      aria-label="Tutorial animado de instalación de Legion SuperPanel v3.15 en MetaTrader 4"
      style={{
        width: "100%",
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: FONT,
        color: C.text,
        background: C.bg,
        borderRadius: 22,
        border: `1px solid ${C.border}`,
        padding: "clamp(14px, 2.4vw, 26px)",
        boxShadow: "0 30px 80px rgba(0,0,0,.45)",
      }}
    >
      <style>{CSS}</style>

      {/* Cabecera */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${C.em}, ${C.blue})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#03241B",
            fontWeight: 900,
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          ▶
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ margin: 0, fontSize: "clamp(18px, 2.4vw, 26px)", fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.2 }}>
            Instala Legion SuperPanel v3.15 en MetaTrader 4
          </h2>
          <p style={{ margin: "4px 0 0", color: C.mute, fontSize: 14 }}>
            Tutorial animado paso a paso, a prueba de novatos. Elige tu sistema y dale a reproducir.
          </p>
        </div>
      </div>

      {/* Selector de sistema operativo */}
      <div
        role="tablist"
        aria-label="Sistema operativo"
        style={{
          display: "flex",
          gap: 8,
          padding: 6,
          borderRadius: 18,
          background: "#0E1420",
          border: `1px solid ${C.border}`,
          marginBottom: 16,
        }}
      >
        <button
          role="tab"
          aria-selected={os === "win"}
          className="lgt-tab"
          onClick={() => changeOs("win")}
        >
          <span style={{ color: os === "win" ? C.blue : "inherit", display: "flex" }}>
            <WinLogo />
          </span>
          <span>
            Windows <span className="lgt-tab-sub">(PC / VPS)</span>
          </span>
        </button>
        <button
          role="tab"
          aria-selected={os === "mac"}
          className="lgt-tab"
          onClick={() => changeOs("mac")}
        >
          <span style={{ color: os === "mac" ? "#F8FAFC" : "inherit", display: "flex" }}>
            <AppleLogo />
          </span>
          <span>
            Mac <span className="lgt-tab-sub">(Apple Silicon / Intel con Wine)</span>
          </span>
        </button>
      </div>

      {/* Reproductor */}
      <div
        tabIndex={0}
        onKeyDown={onKey}
        aria-label="Reproductor. Espacio para reproducir o pausar, flechas para cambiar de paso."
        style={{
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
          background: C.surf,
          outline: "none",
        }}
      >
        {/* barra superior del reproductor */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderBottom: `1px solid ${C.border}`,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              background: "rgba(36,211,169,.14)",
              color: C.em,
              border: `1px solid ${C.em}66`,
              fontWeight: 900,
              fontSize: 12,
              letterSpacing: 0.6,
              padding: "4px 10px",
              borderRadius: 99,
              whiteSpace: "nowrap",
            }}
          >
            PASO {step + 1} DE 4
          </span>
          <span style={{ fontWeight: 800, fontSize: "clamp(14px, 1.7vw, 16px)", flex: 1, minWidth: 160 }}>{scene.title}</span>
          <span className="lgt-hide-sm" style={{ color: C.mute, fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
            {fmt(elapsed)} / {fmt(total)}
          </span>
        </div>

        {/* Escenario */}
        <div style={{ position: "relative" }}>
          <Stage os={os} scene={scene} t={t} />
          {(fresh || ended) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(5,8,14,.55)",
                backdropFilter: "blur(2px)",
              }}
            >
              <button
                className="lgt-ctrl lgt-play"
                onClick={ended ? restart : togglePlay}
                style={{ height: "clamp(54px, 7vw, 72px)", fontSize: "clamp(16px, 2vw, 21px)", padding: "0 clamp(20px, 3vw, 34px)", borderRadius: 99 }}
              >
                {ended ? "✓ ¡Listo! Ver de nuevo" : "▶ Reproducir Tutorial"}
              </button>
            </div>
          )}
          {sceneDone && !auto && (
            <div
              style={{
                position: "absolute",
                right: 12,
                bottom: 12,
                background: "rgba(5,8,14,.85)",
                border: `1px solid ${C.em}`,
                color: "#D1FAE5",
                borderRadius: 10,
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Paso terminado · pulsa «Siguiente»
            </div>
          )}
        </div>

        {/* Subtítulos tipo cine */}
        <div
          aria-live="polite"
          style={{
            background: "#000",
            padding: "clamp(12px, 1.8vw, 18px) clamp(12px, 2.4vw, 28px)",
            minHeight: "clamp(84px, 10vw, 112px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <p className="lgt-sub" style={{ margin: 0, maxWidth: 940 }}>
            <span className="lgt-sub-box">
              {subHead && <span style={{ color: "#FFFFFF" }}>{subHead}</span>}
              <span style={{ color: C.yellow }}>{subBody}</span>
            </span>
          </p>
        </div>

        {/* Barra de capítulos */}
        <div style={{ padding: "14px 16px 4px" }}>
          <div style={{ display: "flex", gap: 6, height: 22 }}>
            {scenes.map((s, i) => {
              const fill = i < step ? 1 : i === step ? clamp01(t / s.dur) : 0;
              return (
                <button
                  key={i}
                  className="lgt-chap"
                  style={{ flex: s.dur }}
                  aria-label={`Ir al paso ${i + 1}: ${s.title}`}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const f = e.detail === 0 ? 0 : clamp01((e.clientX - r.left) / r.width);
                    jump(i, f < 0.08 ? 0 : f * s.dur);
                  }}
                >
                  <span className="lgt-chap-track">
                    <span className="lgt-chap-fill" style={{ transform: `scaleX(${fill})` }} />
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "flex-start" }}>
            {scenes.map((s, i) => (
              <button
                key={i}
                onClick={() => jump(i, 0)}
                style={{
                  flex: s.dur,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  padding: "4px 2px",
                  textAlign: "left",
                  color: i === step ? "#F8FAFC" : C.mute,
                }}
              >
                <span style={{ display: "block", fontWeight: 900, fontSize: 13 }}>
                  <span style={{ color: i <= step ? C.em : "#475569" }}>●</span> Paso {i + 1}
                </span>
                <span className="lgt-hide-sm" style={{ display: "block", fontSize: 11.5, lineHeight: 1.3, marginTop: 2 }}>
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Controles */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px 16px",
          }}
        >
          <button className="lgt-ctrl" onClick={prev} aria-label="Paso anterior">
            ⏮ <span className="lgt-hide-sm">Anterior</span>
          </button>
          <button className="lgt-ctrl lgt-play" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproducir tutorial"}>
            {playing ? "❚❚ Pausar" : ended ? "↺ Ver de nuevo" : "▶ Reproducir Tutorial"}
          </button>
          <button className="lgt-ctrl" onClick={next} aria-label="Paso siguiente" disabled={step >= scenes.length - 1}>
            <span className="lgt-hide-sm">Siguiente</span> ⏭
          </button>
          <button className="lgt-ctrl" onClick={restart} aria-label="Repetir desde el inicio">
            ↺ Repetir
          </button>
          <span style={{ flex: 1 }} />
          <button
            className="lgt-ctrl"
            aria-pressed={!auto}
            onClick={() => setAuto((a) => !a)}
            title="En modo manual cada paso se detiene al terminar"
          >
            {auto ? "⏩ Auto" : "✋ Paso a paso"}
          </button>
          <button
            className="lgt-ctrl"
            aria-pressed={voiceOn && voiceSupported}
            disabled={!voiceSupported}
            onClick={() => setVoiceOn((v) => !v)}
            title={voiceSupported ? "Narración en voz alta" : "Tu navegador no soporta voz; usa los subtítulos"}
          >
            {!voiceSupported ? "🔇 Voz no disponible" : voiceOn ? "🔊 Voz Guía ON" : "🔈 Voz Guía OFF"}
          </button>
        </div>
      </div>

      <p style={{ margin: "12px 4px 0", color: "#64748B", fontSize: 12.5, lineHeight: 1.5 }}>
        Consejo: pulsa <b style={{ color: C.mute }}>Espacio</b> para pausar y las <b style={{ color: C.mute }}>flechas ← →</b> para
        cambiar de paso. Activa «Paso a paso» si quieres ir a tu ritmo mientras lo haces en tu MetaTrader 4.
      </p>
    </section>
  );
}
