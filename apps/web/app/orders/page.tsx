"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, eur, STATUS_NL, type Order } from "@/lib/api";
import { useCart } from "@/lib/cart";

function OrdersInner() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const placed = useSearchParams().get("placed");
  const cart = useCart();
  useEffect(() => { api<Order[]>("/orders").then(setOrders).catch(() => setOrders([])); }, []);

  async function reorder(o: Order) {
    const hits = await api<{ id: string; sku: string; title: string; caseSize: number; price: number | null }[]>("/catalog/lookup", { method: "POST", body: JSON.stringify({ skus: o.lines.map((l) => l.sku) }) });
    for (const l of o.lines) {
      const h = hits.find((x) => x.sku === l.sku);
      if (h?.price != null) cart.add({ variantId: h.id, sku: h.sku, title: h.title, price: h.price, caseSize: h.caseSize }, l.qty);
    }
    location.href = "/winkelwagen";
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Mijn orders</h1>
      {placed && <p className="mt-4 rounded bg-green-50 px-4 py-3 text-green-900">Bedankt! Order #{placed} is ontvangen. Je krijgt een bevestiging per e-mail.</p>}
      {orders === null ? <p className="mt-6 text-stone-500">Laden…</p> : orders.length === 0 ? <p className="mt-6 text-stone-500">Nog geen orders.</p> : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <details key={o.id} className="rounded-lg border border-stone-200 bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center gap-4 px-5 py-4 text-sm">
                <span className="font-semibold">#{o.number}</span>
                <span className="text-stone-600">{new Date(o.createdAt).toLocaleDateString("nl-NL")}</span>
                {o.reference && <span className="text-stone-500">Ref. {o.reference}</span>}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">{STATUS_NL[o.status] ?? o.status}</span>
                <span className="ml-auto font-medium">{eur(o.totalIncVat)}</span>
              </summary>
              <div className="border-t border-stone-100 px-5 py-4 text-sm">
                <table className="w-full"><tbody>
                  {o.lines.map((l) => <tr key={l.id}><td className="py-1">{l.qty} × {l.title} <span className="font-mono text-xs text-stone-500">{l.sku}</span></td><td className="py-1 text-right">{eur(l.lineTotalExVat)}</td></tr>)}
                </tbody></table>
                <div className="mt-3 flex justify-between text-stone-600"><span>Excl. btw {eur(o.subtotalExVat)} · verzending {eur(o.shippingExVat)} · btw {eur(o.vatTotal)}</span>
                  <button onClick={() => reorder(o)} className="text-amber-800 underline">Opnieuw bestellen</button></div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return <Suspense><OrdersInner /></Suspense>;
}
