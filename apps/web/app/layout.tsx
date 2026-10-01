import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whallet — seu dinheiro, em movimento",
  description: "Controle financeiro com clareza.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
