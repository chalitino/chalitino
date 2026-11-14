"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";

type Me = { user: { name: string; role: string }; company: { name: string } | null };

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const [me, setMe] = useState<Me | null>(null);
  const publicPage = path.startsWith("/login") || path.startsWith("/aanvragen");

  useEffect(() => {
    if (publicPage) return;
    api<Me>("/auth/me").then(setMe).catch(() => {});
  }, [path, publicPage]);

  const links = [
    ["/", "Assortiment"],
    ["/snelbestellen", "Snelbestellen"],
    ["/orders", "Mijn orders"],
  ];

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">WicoTreats <span className="text-amber-700">B2B</span></Link>
        {!publicPage && (
          <nav className="flex gap-4 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className={path === href ? "font-medium text-amber-800" : "text-stone-600 hover:text-stone-900"}>{label}</Link>
            ))}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-4 text-sm">
          {!publicPage && (
            <Link href="/winkelwagen" className="rounded-full bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800">Winkelwagen ({count})</Link>
          )}
          {me && (
            <>
              <span className="hidden text-stone-500 sm:inline">{me.company?.name ?? me.user.name}</span>
              <button className="text-stone-600 hover:text-stone-900" onClick={async () => { await api("/auth/logout", { method: "POST" }); router.push("/login"); }}>Uitloggen</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
