"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, eur, type Order } from "@/lib/api";
import { useCart } from "@/lib/cart";

type Quote = { subtotalExVat: number; shippingExVat: number; vatTotal: number; totalIncVat: number; minOrderExVat: number; freeShippingExVat: number; errors: string[]; lines: { variantId: string; unitPriceExVat: number; lineTotalExVat: number }[] };

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

  if (cart.items.length === 0) return <div><h1 className="text-2xl font-semibold">Winkelwagen</h1><p className="mt-4 text-stone-600">Je winkelwagen is leeg.</p></div>;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-2xl font-semibold">Winkelwagen</h1>
        <table className="mt-6 w-full rounded-lg border border-stone-200 bg-white text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Aantal</th><th className="px-4 py-3">Prijs/st.</th><th className="px-4 py-3 text-right">Totaal</th></tr></thead>
          <tbody>
            {cart.items.map((i) => {
              const ql = quote?.lines.find((l) => l.variantId === i.variantId);
              return (
                <tr key={i.variantId} className="border-t border-stone-100">
                  <td className="px-4 py-3"><div className="font-medium">{i.title}</div><div className="font-mono text-xs text-stone-500">{i.sku}</div></td>
                  <td className="px-4 py-3"><input type="number" min={0} step={i.caseSize} value={i.qty} onChange={(e) => cart.setQty(i.variantId, Number(e.target.value))} className="w-20 rounded border border-stone-300 px-2 py-1" /></td>
                  <td className="px-4 py-3">{eur(ql?.unitPriceExVat ?? i.price)}</td>
                  <td className="px-4 py-3 text-right font-medium">{eur(ql?.lineTotalExVat ?? i.price * i.qty)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Jouw referentie / inkoopordernummer<input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" /></label>
          <label className="text-sm">Opmerking voor WicoTreats<input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded border border-stone-300 px-3 py-2" /></label>
        </div>
      </div>
      <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5 text-sm">
        <h2 className="font-semibold">Overzicht</h2>
        {quote && (
          <dl className="mt-3 space-y-1">
            <div className="flex justify-between"><dt>Subtotaal excl. btw</dt><dd>{eur(quote.subtotalExVat)}</dd></div>
            <div className="flex justify-between"><dt>Verzendkosten</dt><dd>{quote.shippingExVat === 0 ? "Gratis" : eur(quote.shippingExVat)}</dd></div>
            <div className="flex justify-between"><dt>Btw</dt><dd>{eur(quote.vatTotal)}</dd></div>
            <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold"><dt>Totaal incl. btw</dt><dd>{eur(quote.totalIncVat)}</dd></div>
          </dl>
        )}
        {quote && quote.shippingExVat > 0 && <p className="mt-3 text-xs text-stone-500">Gratis verzending vanaf {eur(quote.freeShippingExVat)} excl. btw.</p>}
        {quote?.errors.map((e) => <p key={e} className="mt-3 rounded bg-amber-50 px-3 py-2 text-amber-800">{e}</p>)}
        {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-red-700 whitespace-pre-line">{error}</p>}
        <button disabled={busy || !quote || quote.errors.length > 0} onClick={place} className="mt-4 w-full rounded bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-40">{busy ? "Bezig…" : "Bestelling plaatsen"}</button>
        <p className="mt-2 text-xs text-stone-500">Betaling op rekening volgens jouw betaaltermijn.</p>
      </aside>
    </div>
  );
}
