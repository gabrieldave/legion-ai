"use client";

import { useEffect, useState } from "react";

export function PagoSuccessClient({ sessionId }: { sessionId: string }) {
  const [msg, setMsg] = useState("Verificando…");

  useEffect(() => {
    if (!sessionId) {
      setMsg("Sin session_id. Abre /cuenta para comprobar el acceso.");
      return;
    }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 6; i++) {
        const res = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { purchased?: boolean; pending?: boolean; message?: string };
          error?: string;
        };
        if (cancelled) return;
        if (json.data?.purchased) {
          setMsg("Compra activada. Ya puedes descargar el indicador.");
          return;
        }
        setMsg(json.data?.message || json.error || "Verificando…");
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return <p className="ok">{msg}</p>;
}
