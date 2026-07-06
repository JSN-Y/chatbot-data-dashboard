import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Electronics Inventory Assistant",
  description:
    "Assistant IA pour la gestion d'inventaire électronique — Chat + Dashboard prédictif",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-slate-100 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
