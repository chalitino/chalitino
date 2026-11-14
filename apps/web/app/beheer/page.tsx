"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, date, eur, PAYMENT_NL, STATUS_NL, VAT_NL, type Order } from "@/lib/api";

const STATUSES = ["", "RECEIVED", "PROCESSING", "SHIPPED", "INVOICED", "CANCELLED"];

export default function StaffOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [status, setStatus] = useState("RECEIVED");
  const [dash, setDash] = useState<{ received: number; processing: number; awaitingPayment: number; batchesExpiringSoon: number } | null>(null);

  useEffect(() => { api<typeof dash>("/admin/dashboard").then(setDash).catch(() => {}); }, [orders]);
  useEffect(() => { api<Order[]>(`/admin/orders${status ? `?status=${status}` : ""}`).then(setOrders).catch(() => setOrders([])); }, [status]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold">Inkomende orders</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-wt-sand px-3 py-2 text-sm">
          {STATUSES.map((s) => <option key={s} value={s}>{s ? STATUS_NL[s] : "Alle statussen"}</option>)}
        </select>
      </div>
      {dash && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Nieuw", dash.received], ["In behandeling", dash.processing], ["Wacht op vooruitbetaling", dash.awaitingPayment], ["Batches THT < 60 dagen", dash.batchesExpiringSoon]].map(([l, n]) => (
            <div key={l as string} className="rounded-lg border border-wt-sand bg-white p-4"><div className="text-2xl font-semibold">{n}</div><div className="text-xs text-wt-muted">{l}</div></div>
          ))}
        </div>
      )}
      {orders === null ? <p className="mt-6 text-wt-muted">Laden…</p> : orders.length === 0 ? <p className="mt-6 text-wt-muted">Geen orders.</p> : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-wt-sand bg-white">
          <table className="w-full text-sm">
            <thead className="bg-wt-cream text-left text-xs uppercase text-wt-muted"><tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Datum</th><th className="px-4 py-3">Klant</th><th className="px-4 py-3">Land / btw</th><th className="px-4 py-3">Betaling</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Totaal</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-wt-sand/60 hover:bg-wt-cream">
                  <td className="px-4 py-3"><Link href={`/beheer/orders/${o.id}`} className="font-semibold text-wt-rust">#{o.number}</Link>{o.reference && <div className="text-xs text-wt-muted">Ref. {o.reference}</div>}</td>
                  <td className="px-4 py-3">{date(o.createdAt)}</td>
                  <td className="px-4 py-3">{o.company?.name}</td>
                  <td className="px-4 py-3">{o.shipCountry} · {VAT_NL[o.vatScheme]}</td>
                  <td className="px-4 py-3">{PAYMENT_NL[o.paymentTerms]} · <span className={o.paymentStatus === "PAID" ? "text-green-700" : "text-wt-rust"}>{o.paymentStatus === "PAID" ? "betaald" : "open"}</span></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-wt-cream px-2 py-0.5 text-xs">{STATUS_NL[o.status]}</span></td>
                  <td className="px-4 py-3 text-right font-medium">{eur(o.totalIncVat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
