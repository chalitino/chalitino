"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API, api, date, eur, PAYMENT_NL, STATUS_NL, VAT_NL, type Order } from "@/lib/api";

const NEXT: Record<string, { status: string; label: string }[]> = {
  RECEIVED: [{ status: "PROCESSING", label: "In behandeling nemen" }, { status: "CANCELLED", label: "Annuleren" }],
  PROCESSING: [{ status: "SHIPPED", label: "Markeer als verzonden" }, { status: "CANCELLED", label: "Annuleren" }],
  SHIPPED: [{ status: "INVOICED", label: "Markeer als gefactureerd" }],
  INVOICED: [],
  CANCELLED: [],
};

export default function StaffOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => api<Order>(`/admin/orders/${id}`).then((o) => { setOrder(o); setTracking(o.trackingCode ?? ""); }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  async function patch(data: Record<string, unknown>) {
    setError(null);
    try { setOrder(await api<Order>(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) })); } catch (e) { setError((e as Error).message); }
  }

  if (!order) return <p className="text-wt-muted">{error ?? "Laden…"}</p>;
  const prepaidBlock = order.paymentTerms === "PREPAID" && order.paymentStatus !== "PAID";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <Link href="/beheer" className="text-sm text-wt-muted hover:text-wt-brown">← Alle orders</Link>
        <h1 className="mt-2 text-2xl font-semibold">Order #{order.number} <span className="ml-2 rounded-full bg-wt-cream px-2 py-0.5 text-sm font-normal">{STATUS_NL[order.status]}</span></h1>
        <p className="text-sm text-wt-muted">{date(order.createdAt)} · {order.company?.name}{order.reference && <> · Ref. {order.reference}</>}</p>
        {order.note && <p className="mt-2 rounded bg-wt-honey/30 px-3 py-2 text-sm text-wt-brown">Opmerking klant: {order.note}</p>}

        <h2 className="mt-6 font-semibold">Orderregels met batch en THT</h2>
        <p className="text-xs text-wt-muted">Batches zijn automatisch toegewezen volgens FEFO (kortste THT eerst). Dit is de pakbon.</p>
        <table className="mt-2 w-full rounded-lg border border-wt-sand bg-wt-soft text-sm">
          <thead className="bg-wt-cream text-left text-xs uppercase text-wt-muted"><tr><th className="px-4 py-2">Artikel</th><th className="px-4 py-2">Aantal</th><th className="px-4 py-2">Batch</th><th className="px-4 py-2">THT</th><th className="px-4 py-2 text-right">Excl. btw</th></tr></thead>
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.id} className="border-t border-wt-sand/60 align-top">
                <td className="px-4 py-2"><div className="font-medium">{l.title}</div><div className="font-mono text-xs text-wt-muted">{l.sku}</div></td>
                <td className="px-4 py-2">{l.qty}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.batches.map((b) => <div key={b.batch.batchNumber}>{b.batch.batchNumber} <span className="text-wt-muted">× {b.qty}</span></div>)}</td>
                <td className="px-4 py-2 text-xs">{l.batches.map((b) => <div key={b.batch.batchNumber}>{date(b.batch.bestBefore)}</div>)}</td>
                <td className="px-4 py-2 text-right">{eur(l.lineTotalExVat)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border border-wt-sand bg-wt-soft p-4">
            <h3 className="font-semibold">Afleveradres</h3>
            <p className="mt-1 text-wt-brown">{order.company?.name}<br />{order.shipStreet}<br />{order.shipPostcode} {order.shipCity}<br />{order.shipCountry}</p>
            <p className="mt-2 text-wt-muted">{order.company?.email}{order.company?.phone && <> · {order.company.phone}</>}</p>
          </div>
          <div className="rounded-lg border border-wt-sand bg-wt-soft p-4">
            <h3 className="font-semibold">Bedragen</h3>
            <dl className="mt-1 space-y-1 text-wt-brown">
              <div className="flex justify-between"><dt>Subtotaal excl. btw</dt><dd>{eur(order.subtotalExVat)}</dd></div>
              <div className="flex justify-between"><dt>Verzending</dt><dd>{eur(order.shippingExVat)}</dd></div>
              <div className="flex justify-between"><dt>Btw ({VAT_NL[order.vatScheme]})</dt><dd>{eur(order.vatTotal)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Totaal</dt><dd>{eur(order.totalIncVat)}</dd></div>
            </dl>
            {order.vatScheme === "EU_REVERSE_CHARGE" && <p className="mt-2 text-xs text-wt-muted">Factuurtekst: btw verlegd, art. 138 Btw-richtlijn. Btw-nr klant {order.company?.vatNumber}.</p>}
          </div>
        </div>
      </div>

      <aside className="h-fit space-y-4 text-sm">
        <div className="rounded-lg border border-wt-sand bg-wt-soft p-4">
          <h3 className="font-semibold">Documenten</h3>
          <div className="mt-2 flex gap-2">
            <a href={`${API}/admin/orders/${order.id}/pakbon`} target="_blank" rel="noreferrer" className="btn ghost sm flex-1">Pakbon</a>
            <a href={`${API}/admin/orders/${order.id}/factuur`} target="_blank" rel="noreferrer" className="btn ghost sm flex-1">Factuur</a>
          </div>
          {order.invoiceNumber && <p className="mt-2 text-xs text-wt-muted">Factuurnr <span className="font-mono">{order.invoiceNumber}</span></p>}
          <p className="mt-1 text-xs text-wt-muted">Opent in huisstijl; printen of opslaan als PDF. Taal volgt het land van de klant.</p>
        </div>
        <div className="rounded-lg border border-wt-sand bg-wt-soft p-4">
          <h3 className="font-semibold">Betaling</h3>
          <p className="mt-1 text-wt-brown">{PAYMENT_NL[order.paymentTerms]}{order.dueDate && <> · vervalt {date(order.dueDate)}</>}</p>
          <p className={`mt-1 font-medium ${order.paymentStatus === "PAID" ? "text-green-700" : "text-wt-rust"}`}>{order.paymentStatus === "PAID" ? `Betaald op ${date(order.paidAt)}` : "Nog niet betaald"}</p>
          {prepaidBlock && <p className="mt-2 rounded bg-wt-honey/30 px-3 py-2 text-xs text-wt-brown">Vooruitbetaling: pas verzenden na bijschrijving op de bank.</p>}
          <button onClick={() => patch({ paymentStatus: order.paymentStatus === "PAID" ? "UNPAID" : "PAID" })} className="btn ghost sm block mt-3">
            {order.paymentStatus === "PAID" ? "Markeer als onbetaald" : "Markeer als betaald (bank bijgeschreven)"}
          </button>
        </div>
        <div className="rounded-lg border border-wt-sand bg-wt-soft p-4">
          <h3 className="font-semibold">Verzending (Sendcloud)</h3>
          <label className="mt-2 block text-xs text-wt-muted">Track & trace-code
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="mt-1 w-full rounded border border-wt-sand px-2 py-1" placeholder="3SABC…" />
          </label>
          <button onClick={() => patch({ trackingCode: tracking || null })} className="btn ghost sm block mt-2">Opslaan</button>
          {order.shippedAt && <p className="mt-2 text-xs text-wt-muted">Verzonden op {date(order.shippedAt)}</p>}
        </div>
        <div className="rounded-lg border border-wt-sand bg-wt-soft p-4">
          <h3 className="font-semibold">Status</h3>
          <div className="mt-2 space-y-2">
            {NEXT[order.status].map((n) => (
              <button key={n.status} onClick={() => patch({ status: n.status })} disabled={n.status === "SHIPPED" && prepaidBlock}
                className={`btn sm block ${n.status === "CANCELLED" ? "danger" : ""}`}>{n.label}</button>
            ))}
            {NEXT[order.status].length === 0 && <p className="text-wt-muted">Afgerond.</p>}
          </div>
          {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        </div>
      </aside>
    </div>
  );
}
