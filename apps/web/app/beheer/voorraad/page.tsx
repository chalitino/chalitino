"use client";
import { useEffect, useState } from "react";
import { api, date, UNIT_NL } from "@/lib/api";

type Batch = { id: string; batchNumber: string; bestBefore: string; qtyReceived: number; qtyRemaining: number; analysis: string | null };
type Row = { id: string; sku: string; product: string; animal: string | null; title: string; unitType: string; packContent: string | null; caseSize: number; stock: number; batches: Batch[] };

export default function StockPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState({ sku: "", batchNumber: "", bestBefore: "", qty: "", analysis: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = () => api<Row[]>("/admin/stock").then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  async function receive(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await api("/admin/batches", { method: "POST", body: JSON.stringify({ ...form, qty: Number(form.qty) }) });
      setMsg(`Batch ${form.batchNumber} ingeboekt op ${form.sku.toUpperCase()}.`);
      setForm({ sku: "", batchNumber: "", bestBefore: "", qty: "", analysis: "" });
      load();
    } catch (err) { setMsg((err as Error).message); }
  }

  const soon = (d: string) => new Date(d).getTime() < Date.now() + 60 * 86400000;
  const visible = (rows ?? []).filter((r) => !search || `${r.product} ${r.sku} ${r.title}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="h1 text-4xl">Voorraad & batches</h1>
      <p className="text-sm text-wt-muted">Eigen B2B-voorraad, los van Shopify. Voorraad = som van de batches; orders pakken automatisch de kortste THT.</p>

      <form onSubmit={receive} className="mt-6 grid gap-3 rounded-lg border border-wt-sand bg-wt-soft p-4 sm:grid-cols-5 text-sm">
        <h2 className="font-semibold sm:col-span-5">Batch inboeken</h2>
        <input required placeholder="SKU (bv. BRUUN001)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded border border-wt-sand px-3 py-2" />
        <input required placeholder="Batchnummer" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="rounded border border-wt-sand px-3 py-2" />
        <input required type="date" value={form.bestBefore} onChange={(e) => setForm({ ...form, bestBefore: e.target.value })} className="rounded border border-wt-sand px-3 py-2" title="THT" />
        <input required type="number" min={1} placeholder="Aantal" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="rounded border border-wt-sand px-3 py-2" />
        <input placeholder="Analyse (bv. Vocht 12% · E 68% · V 8% · A 6%)" value={form.analysis} onChange={(e) => setForm({ ...form, analysis: e.target.value })} className="rounded border border-wt-sand px-3 py-2 sm:col-span-4" />
        <button className="btn sm">Inboeken</button>
        {msg && <p className="sm:col-span-5 text-wt-brown">{msg}</p>}
      </form>

      <input placeholder="Zoek product of SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-6 rounded border border-wt-sand px-3 py-2 text-sm" />
      <div className="mt-3 overflow-x-auto rounded-lg border border-wt-sand bg-wt-soft">
        <table className="w-full text-sm">
          <thead className="bg-wt-cream text-left text-xs uppercase text-wt-muted"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Eenheid</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Voorraad</th><th className="px-4 py-3">Batches (THT)</th></tr></thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-wt-sand/60 align-top">
                <td className="px-4 py-3 font-medium">{r.product}<div className="text-xs font-normal text-wt-muted">{r.animal}</div></td>
                <td className="px-4 py-3">{UNIT_NL[r.unitType]} {r.packContent}<div className="text-xs text-wt-muted">omdoos {r.caseSize}</div></td>
                <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                <td className={`px-4 py-3 font-semibold ${r.stock === 0 ? "text-red-600" : r.stock < r.caseSize * 2 ? "text-wt-rust" : ""}`}>{r.stock}</td>
                <td className="px-4 py-3 text-xs">
                  {r.batches.length === 0 ? <span className="text-wt-muted/70">geen</span> : r.batches.map((b) => (
                    <div key={b.id} className={soon(b.bestBefore) ? "text-wt-rust" : ""}><span className="font-mono">{b.batchNumber}</span> · {b.qtyRemaining}/{b.qtyReceived} · THT {date(b.bestBefore)}{b.analysis && <span className="text-wt-muted"> · {b.analysis}</span>}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
