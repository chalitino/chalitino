"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API, api, date, eur, PAYMENT_NL, paymentTermsText, STATUS_NL, type Me, type Order } from "@/lib/api";
import { useCart } from "@/lib/cart";

function AccountInner() {
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [batch, setBatch] = useState("");
  const placed = useSearchParams().get("placed");
  const cart = useCart();
  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => {}); }, []);
  useEffect(() => { api<Order[]>(`/orders${batch ? `?batch=${encodeURIComponent(batch)}` : ""}`).then(setOrders).catch(() => setOrders([])); }, [batch]);

  async function reorder(o: Order) {
    const hits = await api<{ id: string; sku: string; title: string; caseSize: number; price: number | null }[]>("/catalog/lookup", { method: "POST", body: JSON.stringify({ skus: o.lines.map((l) => l.sku) }) });
    for (const l of o.lines) { const h = hits.find((x) => x.sku === l.sku); if (h?.price != null) cart.add({ variantId: h.id, sku: h.sku, title: h.title, price: h.price, caseSize: h.caseSize }, l.qty); }
    location.href = "/winkelwagen";
  }
  const c = me?.company;
  const paidCount = (orders ?? []).filter((o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED").length;

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Zakelijk account · {me?.user.email}</div>
        <h1 className="h1">{c?.name ?? "Mijn account"}</h1>
      </div>
      {placed && <div className="notice ok mb-4"><b>Bedankt! Order #{placed} is ontvangen.</b> Je ontvangt een bevestiging per e-mail{orders?.find((o) => String(o.number) === placed)?.paymentTerms === "PREPAID" ? " met betaalinstructies; we verzenden zodra de betaling binnen is" : ""}.</div>}
      {c && (
        <>
          <div className={`status ${c.status === "ACTIVE" ? "ok" : ""}`}>
            <span className="dot" />
            <div className="flex-1"><b>{c.status === "ACTIVE" ? "Goedgekeurd zakelijk account" : "Nog geen goedgekeurd zakelijk account"}</b><span>Netto-prijzen ex BTW zichtbaar · bestellen per karton · {paymentTermsText(c, paidCount)}</span></div>
            <Link className="btn sm" href="/snelbestellen"><span>Snelbestellen</span><span>→</span></Link>
          </div>
          <div className="acct-grid">
            <div><small>Bedrijf</small><b>{c.name}</b></div>
            <div><small>Contactpersoon</small><b>{me?.user.name}</b></div>
            <div><small>KvK</small><b>{c.kvkNumber ?? "—"}</b></div>
            <div><small>BTW-nummer</small><b>{c.vatNumber ?? "—"} {c.vatValidated && <span className="pill ok ml-1">VIES ✓</span>}</b></div>
            <div><small>Klantgroep</small><b>{c.companyType ?? "—"}</b></div>
            <div><small>Betaaltermijn</small><b>{c.prepaidOrders > paidCount ? `vooruit (nog ${c.prepaidOrders - paidCount})` : `${c.paymentTermDays} dagen`}</b></div>
          </div>
          <div className="quick">
            <Link href="/snelbestellen"><b>Snelbestellen</b><span>Hele assortiment in één tabel</span></Link>
            <Link href="/"><b>Assortiment per diersoort</b><span>Live voorraad</span></Link>
            <Link href="/snelbestellen?eenheid=BULK"><b>Bulk per kg</b><span>Ongelabeld, per kg</span></Link>
            <a href="mailto:info@wicotreats.com"><b>Klantenservice</b><span>info@wicotreats.com</span></a>
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <h2 className="h2 text-3xl" id="bestellingen">Bestellingen <span className="pill align-middle">{orders?.length ?? 0}</span></h2>
        <label className="search !h-10 !border-wt-line max-w-xs"><input type="search" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Zoek op batchnummer" /></label>
      </div>
      {orders === null ? <p className="mt-3 text-wt-mute">Laden…</p> : orders.length === 0 ? <p className="lead mt-3">Nog geen bestellingen. <Link href="/snelbestellen" className="underline">Start met snelbestellen</Link>.</p> : (
        <div className="tbl mt-3.5"><table>
          <thead><tr><th>Order</th><th>Datum</th><th>Betaling</th><th>Verzending</th><th className="n">Totaal</th><th>Factuur</th><th className="n"></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/orders/${o.id}`}><b>#{o.number}</b></Link>{o.reference && <><br /><small className="mono text-wt-mute">PO {o.reference}</small></>}</td>
                <td className="mono">{date(o.createdAt)}</td>
                <td><span className={`pill ${o.paymentStatus === "PAID" ? "ok" : o.status === "CANCELLED" ? "bad" : "warn"}`}>{o.paymentStatus === "PAID" ? "Betaald" : `${PAYMENT_NL[o.paymentTerms]} · open`}</span></td>
                <td><span className={`pill ${o.status === "SHIPPED" || o.status === "INVOICED" ? "ok" : o.status === "CANCELLED" ? "bad" : ""}`}>{STATUS_NL[o.status]}</span></td>
                <td className="n mono">{eur(o.totalIncVat)}</td>
                <td className="mono text-xs">{o.invoiceNumber ? <a href={`${API}/orders/${o.id}/factuur`} target="_blank" rel="noreferrer" className="underline">{o.invoiceNumber}</a> : <span className="text-wt-mute">volgt bij verzending</span>}</td>
                <td className="n"><div className="flex justify-end gap-1.5"><Link className="btn ghost sm" href={`/orders/${o.id}`}><span>Bekijk</span></Link>{o.status !== "CANCELLED" && <button className="btn sm" onClick={() => reorder(o)}><span>Opnieuw</span></button>}</div></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {c && (
        <>
          <h2 className="h2 mt-10 text-3xl">Adressen</h2>
          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[2px] border border-wt-line bg-white p-4 text-sm"><span className="pill ok mb-2 inline-block">Aflever</span><br />{c.name}<br />{c.shipStreet}<br />{c.shipPostcode} {c.shipCity}<br />{c.shipCountry}</div>
            <div className="rounded-[2px] border border-wt-line bg-white p-4 text-sm"><span className="pill mb-2 inline-block">Factuur</span><br />{c.name}<br />{c.invoiceStreet}<br />{c.invoicePostcode} {c.invoiceCity}<br />{c.invoiceCountry}<p className="mt-2 text-xs text-wt-mute">Adres wijzigen? Mail info@wicotreats.com.</p></div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AccountPage() { return <Suspense><AccountInner /></Suspense>; }
