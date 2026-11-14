"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, eur, type Product, type Variant } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { animalColor } from "@/lib/brand";

type Row = { p: Product; v: Variant };

function QuickOrder() {
  const sp = useSearchParams();
  const router = useRouter();
  const cart = useCart();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [onlyStock, setOnlyStock] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [paste, setPaste] = useState("");
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);
  const dier = sp.get("dier");
  const eenheid = sp.get("eenheid");

  useEffect(() => { api<Product[]>("/catalog/products").then(setProducts).catch(() => setProducts([])); }, []);
  useEffect(() => { setQ(sp.get("q") ?? ""); }, [sp]);

  const groups = useMemo(() => {
    if (!products) return [];
    const needle = q.trim().toLowerCase();
    const rows: Row[] = products.flatMap((p) => p.variants.map((v) => ({ p, v })));
    const filtered = rows.filter(({ p, v }) =>
      (!dier || p.animal === dier) &&
      (!eenheid || v.unitType === eenheid) &&
      (!onlyStock || v.stock > 0) &&
      (!needle || `${p.title} ${v.sku} ${v.title} ${v.packContent ?? ""} ${v.nextBatch?.batchNumber ?? ""}`.toLowerCase().includes(needle)));
    const m = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = r.v.unitType === "BULK" ? "Bulk per kg" : (r.p.animal ?? "Overig");
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    const keys = [...m.keys()].sort((a, b) => (a === "Bulk per kg" ? 1 : b === "Bulk per kg" ? -1 : a.localeCompare(b)));
    return keys.map((k) => ({ name: k, color: k === "Bulk per kg" ? "#141414" : animalColor(k), rows: m.get(k)! }));
  }, [products, q, dier, eenheid, onlyStock]);

  const lines = Object.entries(qty).filter(([, n]) => n > 0);
  const allRows = useMemo(() => new Map((products ?? []).flatMap((p) => p.variants.map((v) => [v.id, { p, v }] as const))), [products]);
  const units = lines.reduce((s, [, n]) => s + n, 0);
  const sum = lines.reduce((s, [id, n]) => s + n * (allRows.get(id)?.v.price ?? 0), 0);

  function setN(v: Variant, n: number) { setQty({ ...qty, [v.id]: Math.max(0, Math.round(n / (v.caseSize || 1)) * (v.caseSize || 1)) }); }
  function addAll() {
    for (const [id, n] of lines) { const r = allRows.get(id); if (r && r.v.price != null) cart.add({ variantId: id, sku: r.v.sku, title: `${r.p.title} · ${r.v.title}`, price: r.v.price, caseSize: r.v.caseSize }, n); }
    setQty({}); router.push("/winkelwagen");
  }
  async function addPaste(e: React.FormEvent) {
    e.preventDefault();
    const rows = paste.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [sku, n] = l.split(/[\s,;]+/); return { sku: sku.toUpperCase(), n: Number(n) || 0 }; });
    const hits = await api<{ id: string; sku: string; title: string; caseSize: number; price: number | null }[]>("/catalog/lookup", { method: "POST", body: JSON.stringify({ skus: rows.map((r) => r.sku) }) });
    const missing: string[] = []; let added = 0;
    for (const r of rows) { const h = hits.find((x) => x.sku === r.sku); if (!h || h.price == null) { missing.push(r.sku); continue; } cart.add({ variantId: h.id, sku: h.sku, title: h.title, price: h.price, caseSize: h.caseSize }, r.n || h.caseSize); added++; }
    setPasteMsg(`${added} regel(s) toegevoegd aan de wagen.${missing.length ? ` Onbekend: ${missing.join(", ")}` : ""}`); setPaste("");
  }
  const csv = () => {
    const out = ["SKU;Product;Eenheid;Diersoort;Per karton;Prijs ex BTW;Voorraad", ...(products ?? []).flatMap((p) => p.variants.map((v) => `${v.sku};${p.title};${v.title};${p.animal ?? ""};${v.caseSize};${v.price ?? ""};${v.stock}`))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" })); a.download = "wicotreats-prijslijst.csv"; a.click();
  };

  return (
    <div className="pb-24">
      <div className="page-head pb-3">
        <div className="eyebrow">Snelbestellen{dier ? ` · ${dier}` : eenheid === "BULK" ? " · Bulk" : ""}</div>
        <h1 className="h1">Het hele assortiment in <em>één tabel.</em></h1>
        <p className="lead mt-3.5">Per diersoort, per karton. Typ aantallen bij de artikelen die je nodig hebt en zet alles in één keer in je wagen. Voorraad is live.</p>
      </div>
      <div className="sticky top-[108px] z-10 grid items-center gap-3.5 border-b border-wt-line bg-white/95 py-3 backdrop-blur md:grid-cols-[1fr_auto]">
        <label className="search max-w-[460px] !h-10 !border-wt-line"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter op product, artikelnummer, inhoud of batchnummer" /></label>
        <div className="flex flex-wrap items-center gap-3.5 text-[13px]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={onlyStock} onChange={(e) => setOnlyStock(e.target.checked)} className="accent-wt-accent" /> alleen op voorraad</label>
          {(dier || eenheid) && <button className="underline" onClick={() => router.push("/snelbestellen")}>Alles tonen</button>}
          <button className="btn ghost sm" onClick={csv}><span>Download CSV</span></button>
        </div>
      </div>

      {products === null ? <p className="mt-6 text-wt-mute">Laden…</p> : groups.length === 0 ? <p className="mt-6 text-wt-mute">Geen artikelen gevonden.</p> : groups.map((g) => (
        <div key={g.name} className="mt-8">
          <h2 className="mb-2.5 flex items-center gap-2.5 text-xl"><i className="inline-block h-3.5 w-3.5 rounded-[2px]" style={{ background: g.color }} />{g.name} <span className="mono text-xs font-normal text-wt-mute">{g.rows.length} artikelen</span></h2>
          <div className="tbl"><table>
            <thead><tr><th>Product</th><th>Inhoud</th><th>Analyse</th><th>Voorraad</th><th className="n">Prijs ex BTW</th><th className="n">{g.name === "Bulk per kg" ? "Aantal" : "Kartons"}</th><th className="n">Subtotaal</th></tr></thead>
            <tbody>
              {g.rows.map(({ p, v }) => {
                const n = qty[v.id] ?? 0;
                const st = v.stock <= 0 ? "out" : v.stock < v.caseSize * 2 ? "low" : "ok";
                const cartons = v.caseSize > 1 ? Math.round(n / v.caseSize) : n;
                return (
                  <tr key={v.id} className={n > 0 ? "has" : ""}>
                    <td><div className="flex min-w-[220px] items-center gap-2.5">{p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 flex-none rounded-[3px] border border-wt-line bg-white object-contain" /> : <span className="h-10 w-10 flex-none rounded-[3px] border border-wt-line bg-wt-soft" />}<span><b className="block font-semibold leading-tight">{p.title}</b><small className="mono text-[11px] text-wt-mute">{v.sku}</small></span></div></td>
                    <td className="mono text-xs">{v.packContent ?? v.title}{v.caseSize > 1 && <><br /><span className="text-wt-mute">{v.caseSize} / karton</span></>}</td>
                    <td className="mono whitespace-nowrap text-xs text-wt-mute">{v.analysis ?? "—"}</td>
                    <td><span className={`stock ${st}`}><i />{st === "out" ? "nalevering ±2 wk" : st === "low" ? `${v.stock} st` : "op voorraad"}</span></td>
                    <td className="n mono">{v.price != null ? <>{eur(v.price)}{v.tiers.filter((t) => t.minQty > 1).map((t) => <small key={t.minQty} className="block text-[10.5px] text-wt-mute">v.a. {t.minQty}: {eur(t.price)}</small>)}</> : <span className="lbl">op aanvraag</span>}</td>
                    <td className="n">{v.price != null ? (
                      <span className="qty"><button type="button" aria-label="minder" onClick={() => setN(v, n - v.caseSize)}>−</button><input type="number" min={0} step={v.caseSize} value={cartons} onChange={(e) => setN(v, Number(e.target.value) * (v.caseSize || 1))} aria-label="aantal" /><button type="button" aria-label="meer" onClick={() => setN(v, n + v.caseSize)}>+</button></span>
                    ) : "—"}</td>
                    <td className="n mono">{n > 0 && v.price != null ? <b>{eur(n * v.price)}</b> : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      ))}
      <p className="lbl mt-6 normal-case tracking-[0.08em]">Prijzen ex BTW per zakje; bestelstap is één karton. Bulk wordt per kg geleverd. Artikelen zonder voorraad worden binnen ±2 weken gedroogd en nageleverd.</p>

      <details className="mt-10 rounded-[2px] border border-wt-line bg-wt-bg p-5">
        <summary className="cursor-pointer font-display text-lg">Liever een lijst plakken? SKU en aantal per regel</summary>
        <form onSubmit={addPaste} className="form mt-3 max-w-lg">
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} className="mono" placeholder={"BRUUN001 24\nBRUUN016-B1 10"} />
          {pasteMsg && <div className="notice">{pasteMsg}</div>}
          <div><button className="btn sm"><span>Toevoegen aan wagen</span></button></div>
        </form>
      </details>

      <div className={`qo-bar ${lines.length ? "on" : ""}`}>
        <div className="wrap flex flex-wrap items-center justify-between gap-3 py-3.5">
          <div className="text-[13.5px]"><b className="mono">{lines.length}</b> regels · <b className="mono">{units}</b> eenheden · subtotaal <b className="mono">{eur(sum)}</b> ex BTW</div>
          <div className="flex gap-2.5"><button className="btn ghost sm !border-white/50 !text-white" onClick={() => setQty({})}><span>Leegmaken</span></button><button className="btn gold sm" onClick={addAll}><span>Alles in de wagen</span><span>→</span></button></div>
        </div>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense><QuickOrder /></Suspense>; }
