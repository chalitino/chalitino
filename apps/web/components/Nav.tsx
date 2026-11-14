"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Me } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Wordmark } from "@/lib/brand";

const IcUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
const IcBag = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
const IcSearch = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState("");
  const publicPage = path.startsWith("/login") || path.startsWith("/aanvragen");

  useEffect(() => {
    if (publicPage) { setMe(null); return; }
    api<Me>("/auth/me").then((m) => {
      setMe(m);
      if (m.user.role !== "CUSTOMER" && !path.startsWith("/beheer")) router.replace("/beheer");
      if (m.user.role === "CUSTOMER" && path.startsWith("/beheer")) router.replace("/");
    }).catch(() => {});
  }, [path, publicPage, router]);

  const isStaff = !!me && me.user.role !== "CUSTOMER";
  const cats: [string, string][] = isStaff
    ? [["/beheer", "Orders"], ["/beheer/voorraad", "Voorraad & batches"], ...(me!.user.role === "ADMIN" ? [["/beheer/klanten", "Klanten"] as [string, string]] : [])]
    : [["/", "Assortiment"], ["/snelbestellen", "Snelbestellen"], ["/snelbestellen?eenheid=BULK", "Bulk per kg"], ["/account", "Mijn account"]];

  return (
    <header className="sticky top-0 z-50 border-b border-wt-line bg-wt-bg/95 backdrop-blur">
      <div className="wrap">
        <div className="grid items-center gap-4 py-3.5 md:grid-cols-[auto_1fr_auto] md:gap-7">
          <Link href={isStaff ? "/beheer" : "/"} className="flex items-center gap-3 text-wt-ink" aria-label="WicoTreats — home">
            <Wordmark height={30} />
            <small className="rounded-[2px] border border-wt-ink px-[7px] py-[5px] text-[9.5px] font-bold uppercase tracking-[0.14em]">{isStaff ? "Beheer" : "Zakelijk"}</small>
          </Link>
          {!publicPage && !isStaff && (
            <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/snelbestellen?q=${encodeURIComponent(q)}`); }}>
              <IcSearch />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op artikelnummer, product of batchnummer" aria-label="Zoeken" />
            </form>
          )}
          {(publicPage || isStaff) && <div className="hidden md:block" />}
          <div className="flex items-center gap-2.5">
            {me ? (
              <>
                <Link className="btn ghost sm" href={isStaff ? "/beheer" : "/account"}><IcUser /><span className="hidden sm:inline">{me.company?.name ?? me.user.name}</span></Link>
                {!isStaff && <Link className="btn ghost sm" href="/winkelwagen"><IcBag /><span>Wagen ·</span><b>{count}</b></Link>}
                <button className="btn ghost sm" onClick={async () => { await api("/auth/logout", { method: "POST" }); setMe(null); router.push("/login"); }}>Uitloggen</button>
              </>
            ) : (
              <>
                <Link className="btn ghost sm" href="/login"><IcUser /><span>Inloggen</span></Link>
                <Link className="btn sm" href="/aanvragen"><span>Account aanvragen</span></Link>
              </>
            )}
          </div>
        </div>
        {me && (
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Hoofdmenu">
            {cats.map(([href, label]) => {
              const on = path === href.split("?")[0] && (!href.includes("?") || (typeof window !== "undefined" && location.search === "?" + href.split("?")[1]));
              return <Link key={href} href={href} className={`relative whitespace-nowrap px-3 py-3 text-[11.5px] font-bold uppercase tracking-[0.12em] ${on ? "text-wt-ink after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-wt-accent" : "text-wt-mute hover:text-wt-ink"}`}>{label}</Link>;
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
