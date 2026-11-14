import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "WicoTreats B2B — zakelijk bestellen",
  description: "Zakelijk bestelportaal van WicoTreats: natuurlijke hondensnacks voor dierenspeciaalzaken, groothandels en professionals.",
  icons: { icon: [{ url: "/brand/favicon-64.png", sizes: "64x64", type: "image/png" }, { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/brand/icon-512.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Gluten:wght@700;800;900&family=Rethink+Sans:ital,wght@0,400..800;1,400..800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="flex min-h-screen flex-col bg-wt-bg text-wt-ink antialiased">
        <Nav />
        <main className="wrap flex-1 pb-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
