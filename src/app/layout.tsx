import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { DadosProvider } from "@/lib/dados/DadosProvider";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Rumo ao TJSP",
  description: "Plataforma de estudos para o concurso de Escrevente Técnico Judiciário do TJ-SP (Vunesp).",
  appleWebApp: { capable: true, title: "Rumo ao TJSP", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#C11574",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <DadosProvider>
          <AppShell>{children}</AppShell>
        </DadosProvider>
      </body>
    </html>
  );
}
