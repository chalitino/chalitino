"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API, api, date, eur, PAYMENT_NL, STATUS_NL, VAT_NL, type Order } from "@/lib/api";
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
      {placed && <p className="mt-4 rounded bg-emerald-50 px-4 py-3 text-green-900">Bedankt! Order #{placed} is ontvangen. Je krijgt een bevestiging per e-mail.</p>}
      {orders === null ? <p className="mt-6 text-wt-muted">Laden…</p> : orders.length === 0 ? <p className="mt-6 text-wt-muted">Nog geen orders.</p> : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <details key={o.id} className="rounded-lg border border-wt-sand bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center gap-4 px-5 py-4 text-sm">
                <span className="font-semibold">#{o.number}</span>
                <span className="text-wt-muted">{new Date(o.createdAt).toLocaleDateString("nl-NL")}</span>
                {o.reference && <span className="text-wt-muted">Ref. {o.reference}</span>}
                <span className="rounded-full bg-wt-cream px-2 py-0.5 text-xs">{STATUS_NL[o.status] ?? o.status}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${o.paymentStatus === "PAID" ? "bg-emerald-50 text-green-800" : "bg-wt-honey/30 text-wt-rust"}`}>{PAYMENT_NL[o.paymentTerms]} · {o.paymentStatus === "PAID" ? "betaald" : "open"}</span>
                <span className="ml-auto font-medium">{eur(o.totalIncVat)}</span>
              </summary>
              <div className="border-t border-wt-sand/60 px-5 py-4 text-sm">
                <table className="w-full"><tbody>
                  {o.lines.map((l) => <tr key={l.id} className="align-top"><td className="py-1">{l.qty} × {l.title} <span className="font-mono text-xs text-wt-muted">{l.sku}</span>
                    {l.batches?.length > 0 && <div className="text-xs text-wt-muted">Batch {l.batches.map((b) => `${b.batch.batchNumber} (THT ${date(b.batch.bestBefore)})`).join(", ")}</div>}</td><td className="py-1 text-right">{eur(l.lineTotalExVat)}</td></tr>)}
                </tbody></table>
                {o.paymentTerms === "PREPAID" && o.paymentStatus !== "PAID" && o.status !== "CANCELLED" && (
                  <p className="mt-3 rounded bg-wt-honey/30 px-3 py-2 text-wt-brown">Maak {eur(o.totalIncVat)} over onder vermelding van order #{o.number}. We verzenden zodra de betaling binnen is.</p>
                )}
                {o.paymentTerms === "ON_ACCOUNT" && o.dueDate && o.paymentStatus !== "PAID" && <p className="mt-3 text-wt-muted">Te betalen vóór {date(o.dueDate)}.</p>}
                {o.trackingCode && <p className="mt-3 text-wt-muted">Track & trace: <span className="font-mono">{o.trackingCode}</span></p>}
                <div className="mt-3 flex justify-between text-wt-muted"><span>Excl. btw {eur(o.subtotalExVat)} · verzending {eur(o.shippingExVat)} · btw {eur(o.vatTotal)} ({VAT_NL[o.vatScheme]})</span>
                  <span className="flex gap-3">{o.invoiceNumber && <a href={`${API}/orders/${o.id}/factuur`} target="_blank" rel="noreferrer" className="text-wt-rust underline">Factuur {o.invoiceNumber}</a>}
                  <button onClick={() => reorder(o)} className="text-wt-rust underline">Opnieuw bestellen</button></span></div>
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
