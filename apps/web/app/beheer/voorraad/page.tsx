"use client";
import { useEffect, useState } from "react";
import { api, date, UNIT_NL } from "@/lib/api";

type Batch = { id: string; batchNumber: string; bestBefore: string; qtyReceived: number; qtyRemaining: number };
type Row = { id: string; sku: string; product: string; animal: string | null; title: string; unitType: string; packContent: string | null; caseSize: number; stock: number; batches: Batch[] };

export default function StockPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [form, setForm] = useState({ sku: "", batchNumber: "", bestBefore: "", qty: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = () => api<Row[]>("/admin/stock").then(setRows).catch(() => setRows([]));
  useEffect(() => { load(); }, []);

  async function receive(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    try {
      await api("/admin/batches", { method: "POST", body: JSON.stringify({ ...form, qty: Number(form.qty) }) });
      setMsg(`Batch ${form.batchNumber} ingeboekt op ${form.sku.toUpperCase()}.`);
      setForm({ sku: "", batchNumber: "", bestBefore: "", qty: "" });
      load();
    } catch (err) { setMsg((err as Error).message); }
  }

  const soon = (d: string) => new Date(d).getTime() < Date.now() + 60 * 86400000;
  const visible = (rows ?? []).filter((r) => !search || `${r.product} ${r.sku} ${r.title}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Voorraad & batches</h1>
      <p className="text-sm text-stone-600">Eigen B2B-voorraad, los van Shopify. Voorraad = som van de batches; orders pakken automatisch de kortste THT.</p>

      <form onSubmit={receive} className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-5 text-sm">
        <h2 className="font-semibold sm:col-span-5">Batch inboeken</h2>
        <input required placeholder="SKU (bv. BRUUN001)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="rounded border border-stone-300 px-3 py-2" />
        <input required placeholder="Batchnummer" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="rounded border border-stone-300 px-3 py-2" />
        <input required type="date" value={form.bestBefore} onChange={(e) => setForm({ ...form, bestBefore: e.target.value })} className="rounded border border-stone-300 px-3 py-2" title="THT" />
        <input required type="number" min={1} placeholder="Aantal" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} className="rounded border border-stone-300 px-3 py-2" />
        <button className="rounded bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800">Inboeken</button>
        {msg && <p className="sm:col-span-5 text-stone-700">{msg}</p>}
      </form>

      <input placeholder="Zoek product of SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-6 rounded border border-stone-300 px-3 py-2 text-sm" />
      <div className="mt-3 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase text-stone-600"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Eenheid</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Voorraad</th><th className="px-4 py-3">Batches (THT)</th></tr></thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-stone-100 align-top">
                <td className="px-4 py-3 font-medium">{r.product}<div className="text-xs font-normal text-stone-500">{r.animal}</div></td>
                <td className="px-4 py-3">{UNIT_NL[r.unitType]} {r.packContent}<div className="text-xs text-stone-500">omdoos {r.caseSize}</div></td>
                <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                <td className={`px-4 py-3 font-semibold ${r.stock === 0 ? "text-red-600" : r.stock < r.caseSize * 2 ? "text-amber-700" : ""}`}>{r.stock}</td>
                <td className="px-4 py-3 text-xs">
                  {r.batches.length === 0 ? <span className="text-stone-400">geen</span> : r.batches.map((b) => (
                    <div key={b.id} className={soon(b.bestBefore) ? "text-amber-700" : ""}><span className="font-mono">{b.batchNumber}</span> · {b.qtyRemaining}/{b.qtyReceived} · THT {date(b.bestBefore)}</div>
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
