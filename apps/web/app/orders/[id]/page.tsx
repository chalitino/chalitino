"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API, api, date, eur, PAYMENT_NL, STATUS_NL, VAT_NL, type Order } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [o, setO] = useState<Order | null>(null);
  const cart = useCart();
  useEffect(() => { api<Order>(`/orders/${id}`).then(setO).catch(() => {}); }, [id]);
  if (!o) return <p className="py-10 text-wt-mute">Laden…</p>;

  async function reorder() {
    const hits = await api<{ id: string; sku: string; title: string; caseSize: number; price: number | null }[]>("/catalog/lookup", { method: "POST", body: JSON.stringify({ skus: o!.lines.map((l) => l.sku) }) });
    for (const l of o!.lines) { const h = hits.find((x) => x.sku === l.sku); if (h?.price != null) cart.add({ variantId: h.id, sku: h.sku, title: h.title, price: h.price, caseSize: h.caseSize }, l.qty); }
    location.href = "/winkelwagen";
  }
  const prepaidOpen = o.paymentTerms === "PREPAID" && o.paymentStatus !== "PAID" && o.status !== "CANCELLED";

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow"><Link href="/account" className="underline">Account</Link> / Bestelling</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="h1">Order #{o.number}</h1><p className="lead mt-2.5">Geplaatst op {new Date(o.createdAt).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}{o.reference && ` · PO ${o.reference}`}</p></div>
          <div className="flex flex-wrap gap-2">{o.status !== "CANCELLED" && <button className="btn" onClick={reorder}><span>Opnieuw bestellen</span></button>}{o.invoiceNumber && <a className="btn ghost" href={`${API}/orders/${o.id}/factuur`} target="_blank" rel="noreferrer"><span>Factuur</span></a>}</div>
        </div>
        <div className="acct-grid mt-5">
          <div><small>Betaling</small><b><span className={`pill ${o.paymentStatus === "PAID" ? "ok" : "warn"}`}>{o.paymentStatus === "PAID" ? `Betaald ${date(o.paidAt)}` : `${PAYMENT_NL[o.paymentTerms]} · open`}</span></b></div>
          <div><small>Verzending</small><b><span className={`pill ${o.status === "SHIPPED" || o.status === "INVOICED" ? "ok" : o.status === "CANCELLED" ? "bad" : ""}`}>{STATUS_NL[o.status]}</span></b></div>
          <div><small>Factuur</small><b className="mono">{o.invoiceNumber ?? "volgt bij verzending"}</b></div>
          <div><small>Betaaltermijn</small><b>{o.paymentTerms === "PREPAID" ? "vooruit" : `${o.dueDate ? `vóór ${date(o.dueDate)}` : "op rekening"}`}</b></div>
          <div><small>BTW</small><b>{VAT_NL[o.vatScheme]}</b></div>
        </div>
      </div>
      {prepaidOpen && <div className="notice soft mb-4"><b>Vooruitbetaling.</b> Maak {eur(o.totalIncVat)} over naar IBAN NL69 INGB 0682 8682 05 t.n.v. Wico Diervoeding V.O.F. onder vermelding van order #{o.number}. We verzenden zodra de betaling binnen is.</div>}
      <div className="tbl"><table>
        <thead><tr><th>Artikel</th><th>Art.nr</th><th>Partij / THT</th><th className="n">Prijs</th><th className="n">Aantal</th><th className="n">Totaal</th></tr></thead>
        <tbody>
          {o.lines.map((l) => (
            <tr key={l.id}>
              <td><b>{l.title}</b></td>
              <td className="mono">{l.sku}</td>
              <td className="mono text-xs">{l.batches.length ? l.batches.map((b) => <div key={b.batch.batchNumber}>{b.batch.batchNumber}{l.batches.length > 1 && ` × ${b.qty}`}<br /><span className="text-wt-mute">THT {date(b.batch.bestBefore)}</span></div>) : <span className="text-wt-mute">op pakbon</span>}</td>
              <td className="n mono">{eur(l.unitPriceExVat)}</td>
              <td className="n mono">{l.qty}</td>
              <td className="n mono"><b>{eur(l.lineTotalExVat)}</b></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="tot">
        <div><span>Subtotaal ex BTW</span><b className="mono">{eur(o.subtotalExVat)}</b></div>
        <div><span>Verzending</span><b className="mono">{Number(o.shippingExVat) === 0 ? "Gratis" : eur(o.shippingExVat)}</b></div>
        <div><span>BTW {o.vatScheme === "EU_REVERSE_CHARGE" ? "(verlegd)" : o.vatScheme === "EXPORT" ? "(export 0%)" : ""}</span><b className="mono">{eur(o.vatTotal)}</b></div>
        <div className="g"><span>Totaal</span><b className="mono">{eur(o.totalIncVat)}</b></div>
      </div>
      <h2 className="h2 mt-10 text-3xl">Adressen</h2>
      <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[2px] border border-wt-line bg-wt-soft p-4 text-sm"><span className="pill mb-2 inline-block">Aflever</span><br />{o.shipStreet}<br />{o.shipPostcode} {o.shipCity}<br />{o.shipCountry}</div>
        {o.trackingCode && <div className="rounded-[2px] border border-wt-line bg-wt-soft p-4 text-sm"><span className="pill ok mb-2 inline-block">{date(o.shippedAt)}</span><br />Sendcloud<br />{o.trackingUrl ? <a href={o.trackingUrl} className="mono underline" target="_blank" rel="noreferrer">{o.trackingCode}</a> : <span className="mono">{o.trackingCode}</span>}</div>}
      </div>
      {o.note && <><h2 className="h2 mt-10 text-3xl">Opmerking</h2><p className="lead mt-2">{o.note}</p></>}
    </div>
  );
}
