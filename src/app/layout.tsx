import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./_components/ThemeProvider";
import { LockGate } from "./_components/LockGate";
import { RegistroSW } from "./_components/RegistroSW";
import { RecuperacionActualizacion } from "./_components/RecuperacionActualizacion";
import { SCRIPT_ANTIFLASH } from "@/lib/tema";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OncoTrack",
  description:
    "Expediente oncológico personal: documentos, analíticas, tratamientos y preparación de consultas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      // El script anti-flash escribe data-theme antes de hidratar (a propósito)
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTIFLASH }} />
        <ThemeProvider />
        <RegistroSW />
        <RecuperacionActualizacion />
        <LockGate>{children}</LockGate>
      </body>
    </html>
  );
}
