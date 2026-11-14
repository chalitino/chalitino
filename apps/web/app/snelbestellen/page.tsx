"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart";

type Hit = { id: string; sku: string; title: string; caseSize: number; stock: number; price: number | null };

export default function QuickOrderPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ added: string[]; missing: string[]; noPrice: string[] } | null>(null);
  const cart = useCart();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [sku, q] = l.split(/[\s,;]+/);
      return { sku: sku.toUpperCase(), qty: Number(q) || 0 };
    });
    const hits = await api<Hit[]>("/catalog/lookup", { method: "POST", body: JSON.stringify({ skus: rows.map((r) => r.sku) }) });
    const added: string[] = [], missing: string[] = [], noPrice: string[] = [];
    for (const r of rows) {
      const h = hits.find((x) => x.sku === r.sku);
      if (!h) { missing.push(r.sku); continue; }
      if (h.price == null) { noPrice.push(r.sku); continue; }
      cart.add({ variantId: h.id, sku: h.sku, title: h.title, price: h.price, caseSize: h.caseSize }, r.qty || h.caseSize);
      added.push(`${r.qty || h.caseSize} × ${h.title}`);
    }
    setResult({ added, missing, noPrice });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Snelbestellen</h1>
      <p className="mt-1 text-sm text-wt-muted">Plak per regel een SKU en aantal, bijvoorbeeld <code className="rounded bg-wt-cream px-1">BRUUN001 24</code>. Zonder aantal wordt één omdoos genomen.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className="w-full rounded border border-wt-sand p-3 font-mono text-sm" placeholder={"BRUUN001 24\nBRUUN016 12"} />
        <button className="rounded bg-wt-rust px-4 py-2 font-medium text-white hover:bg-wt-rust-dark">Toevoegen aan winkelwagen</button>
      </form>
      {result && (
        <div className="mt-6 space-y-2 rounded-lg border border-wt-sand bg-white p-4 text-sm">
          {result.added.length > 0 && <div><div className="font-medium text-green-700">Toegevoegd</div><ul className="list-disc pl-5">{result.added.map((a) => <li key={a}>{a}</li>)}</ul></div>}
          {result.missing.length > 0 && <div className="text-red-700">Onbekende SKU&apos;s: {result.missing.join(", ")}</div>}
          {result.noPrice.length > 0 && <div className="text-wt-rust">Geen prijs (op aanvraag): {result.noPrice.join(", ")}</div>}
          {result.added.length > 0 && <button onClick={() => router.push("/winkelwagen")} className="mt-2 rounded border border-wt-sand px-3 py-1.5 hover:bg-wt-cream">Naar winkelwagen</button>}
        </div>
      )}
    </div>
  );
}
