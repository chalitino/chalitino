"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, eur, type Order, type Quote } from "@/lib/api";
import { useCart } from "@/lib/cart";


export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cart.items.length === 0) { setQuote(null); return; }
    api<Quote>("/orders/quote", { method: "POST", body: JSON.stringify({ lines: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }) }).then(setQuote).catch((e) => setError(e.message));
  }, [cart.items]);

  async function place() {
    setBusy(true); setError(null);
    try {
      const order = await api<Order>("/orders", { method: "POST", body: JSON.stringify({ reference: reference || undefined, note: note || undefined, lines: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }) });
      cart.clear();
      router.push(`/orders?placed=${order.number}`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (cart.items.length === 0) return <div className="page-head"><div className="eyebrow">Winkelwagen</div><h1 className="h1">Je wagen is leeg.</h1><p className="lead mt-3.5">Ga naar <Link href="/snelbestellen" className="underline">snelbestellen</Link> om artikelen toe te voegen.</p></div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="page-head"><div className="eyebrow">Winkelwagen</div><h1 className="h1">Controleren en <em>bestellen.</em></h1></div>
        <div className="tbl"><table>
          <thead><tr><th>Product</th><th>Aantal</th><th className="n">Prijs ex BTW</th><th className="n">Totaal</th></tr></thead>
          <tbody>
            {cart.items.map((i) => {
              const ql = quote?.lines.find((l) => l.variantId === i.variantId);
              return (
                <tr key={i.variantId}>
                  <td><b>{i.title}</b><br /><small className="mono text-wt-mute">{i.sku}{i.caseSize > 1 && ` · ${i.caseSize} / karton`}</small></td>
                  <td><span className="qty"><button type="button" onClick={() => cart.setQty(i.variantId, i.qty - i.caseSize)}>−</button><input type="number" min={0} step={i.caseSize} value={i.qty} onChange={(e) => cart.setQty(i.variantId, Number(e.target.value))} /><button type="button" onClick={() => cart.setQty(i.variantId, i.qty + i.caseSize)}>+</button></span></td>
                  <td className="n mono">{eur(ql?.unitPriceExVat ?? i.price)}</td>
                  <td className="n mono"><b>{eur(ql?.lineTotalExVat ?? i.price * i.qty)}</b></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <div className="form mt-6"><div className="two">
          <label>Jouw PO-nummer / referentie<input value={reference} onChange={(e) => setReference(e.target.value)} /></label>
          <label>Opmerking voor WicoTreats<input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div></div>
      </div>
      <aside className="h-fit rounded-[2px] border border-wt-line bg-wt-bg p-5 text-sm lg:mt-14">
        <h2 className="text-xl">Overzicht</h2>
        {quote && (
          <dl className="mt-3 space-y-1">
            <div className="flex justify-between"><dt>Subtotaal excl. btw</dt><dd>{eur(quote.subtotalExVat)}</dd></div>
            <div className="flex justify-between"><dt>Verzendkosten</dt><dd>{quote.shippingExVat === 0 ? "Gratis" : eur(quote.shippingExVat)}</dd></div>
            <div className="flex justify-between"><dt>Btw</dt><dd>{eur(quote.vatTotal)}</dd></div>
            <div className="text-xs text-wt-muted">{quote.vatSchemeLabel}</div>
            <div className="flex justify-between border-t border-wt-sand pt-2 font-semibold"><dt>Totaal incl. btw</dt><dd>{eur(quote.totalIncVat)}</dd></div>
          </dl>
        )}
        {quote && quote.shippingExVat > 0 && <p className="mt-3 text-xs text-wt-muted">Gratis verzending vanaf {eur(quote.freeShippingExVat)} excl. btw.</p>}
        {quote?.errors.map((e) => <p key={e} className="mt-3 rounded bg-wt-honey/30 px-3 py-2 text-wt-rust">{e}</p>)}
        {error && <div className="notice bad mt-3 whitespace-pre-line">{error}</div>}
        <button disabled={busy || !quote || quote.errors.length > 0} onClick={place} className="btn block mt-4"><span>{busy ? "Bezig…" : "Bestelling plaatsen"}</span><span>→</span></button>
        {quote && (
          <p className="mt-2 text-xs text-wt-muted">
            {quote.paymentTerms === "PREPAID"
              ? "Vooruitbetaling: je ontvangt betaalinstructies; we verzenden na bijschrijving. Na je eerste bestellingen kun je op rekening bestellen."
              : `Op rekening, betaling binnen ${quote.paymentTermDays} dagen na factuurdatum.`}
          </p>
        )}
      </aside>
    </div>
  );
}
