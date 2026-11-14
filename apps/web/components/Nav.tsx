"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Me } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const [me, setMe] = useState<Me | null>(null);
  const publicPage = path.startsWith("/login") || path.startsWith("/aanvragen");

  useEffect(() => {
    if (publicPage) return;
    api<Me>("/auth/me").then((m) => {
      setMe(m);
      // Medewerkers landen in het beheer, dealers in de shop.
      if (m.user.role !== "CUSTOMER" && !path.startsWith("/beheer")) router.replace("/beheer");
      if (m.user.role === "CUSTOMER" && path.startsWith("/beheer")) router.replace("/");
    }).catch(() => {});
  }, [path, publicPage, router]);

  const isStaff = me && me.user.role !== "CUSTOMER";
  const links = isStaff
    ? [["/beheer", "Orders"], ["/beheer/voorraad", "Voorraad & batches"], ...(me.user.role === "ADMIN" ? [["/beheer/klanten", "Klanten"]] : [])]
    : [["/", "Assortiment"], ["/snelbestellen", "Snelbestellen"], ["/orders", "Mijn orders"]];

  return (
    <header className="border-b border-wt-sand bg-wt-cream">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href={isStaff ? "/beheer" : "/"} className="font-display text-2xl font-extrabold tracking-tight text-wt-brown">WicoTreats <span className="text-wt-rust">{isStaff ? "Beheer" : "B2B"}</span></Link>
        {!publicPage && (
          <nav className="flex gap-4 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? "font-medium text-wt-rust" : "text-wt-muted hover:text-wt-brown"}>{label}</Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-4 text-sm">
          {!publicPage && !isStaff && (
            <Link href="/winkelwagen" className="rounded-sm bg-wt-brown px-3 py-1.5 font-medium text-white hover:bg-wt-rust-dark">Winkelwagen ({count})</Link>
          )}
          {me && (
            <>
              <span className="hidden text-wt-muted sm:inline">{me.company?.name ?? me.user.name}</span>
              <button className="text-wt-muted hover:text-wt-brown" onClick={async () => { await api("/auth/logout", { method: "POST" }); router.push("/login"); }}>Uitloggen</button>
            </>
          )}
        </div>
      </div>
      <div className="wt-strip">{["#8b3a2a","#4a3933","#7a6a3e","#b86f4a","#c9a24a","#3e6a8a","#9a8a7a","#5a4a3a","#b08a5a","#6a7a5a"].map((c) => <i key={c} style={{ background: c }} />)}</div>
    </header>
  );
}
