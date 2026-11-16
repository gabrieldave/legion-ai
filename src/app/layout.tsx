import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Legion SuperPanel para MetaTrader 4",
  description:
    "17 módulos de análisis en un panel para MT4. Compra segura $350 USD.",
  metadataBase: new URL("https://legionai.iareal.net"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
