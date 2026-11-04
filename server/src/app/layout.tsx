import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-pop", display: "swap" });

export const metadata: Metadata = {
  title: "Tá Pago!",
  description: "Treinou, tá pago. Ranking de treino com seus contatos do PhizChat.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#FF5A1F",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
