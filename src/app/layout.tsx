import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const titulo = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-titulo" });
const cuerpo = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-cuerpo" });

export const metadata: Metadata = {
  title: "NekoTask Studio",
  description: "Tareas, hábitos, dinero y calendario con Blanquita, Bizca, Mango y Ronro.",
  applicationName: "NekoTask Studio",
  appleWebApp: { capable: true, title: "NekoTask", statusBarStyle: "black-translucent" },
  icons: { icon: "/iconos/icono-192.png", apple: "/iconos/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#121212",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${titulo.variable} ${cuerpo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
