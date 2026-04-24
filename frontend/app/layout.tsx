import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stigma",
  description: "Plataforma de agendamento para tatuadores",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}