import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "WicoTreats B2B — dealerportaal",
  description: "Bestelportaal voor wederverkopers van WicoTreats / BRUUN hondensnacks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gluten:wght@800&family=Rethink+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-white text-wt-brown antialiased">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-[10px] font-bold uppercase tracking-[0.12em] text-wt-muted">
          Wico Diervoeding V.O.F. · Maalbroekweg 1B · 6071 NS Swalmen · info@wicotreats.com · KvK 13033716 · NVWA 7346
          <span className="float-right font-display text-sm normal-case tracking-normal text-wt-rust">Met de hand ingepakt in Swalmen.</span>
        </footer>
      </body>
    </html>
  );
}
