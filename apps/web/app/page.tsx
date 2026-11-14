"use client";
import { useEffect, useState } from "react";
import { api, eur, UNIT_NL, type Product } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [animals, setAnimals] = useState<{ animal: string; count: number }[]>([]);
  const [animal, setAnimal] = useState<string>("");
  const [search, setSearch] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const cart = useCart();

  useEffect(() => { api<typeof animals>("/catalog/animals").then(setAnimals).catch(() => {}); }, []);
  useEffect(() => {
    const q = new URLSearchParams();
    if (animal) q.set("animal", animal);
    if (search) q.set("search", search);
    api<Product[]>(`/catalog/products?${q}`).then(setProducts).catch(() => setProducts([]));
  }, [animal, search]);

  function add(p: Product, v: Product["variants"][0]) {
    if (v.price == null) return;
    const n = qty[v.id] ?? v.caseSize;
    cart.add({ variantId: v.id, sku: v.sku, title: `${p.title} · ${v.title}`, price: v.price, caseSize: v.caseSize }, n);
    setFlash(`${n} × ${p.title} toegevoegd`);
    setTimeout(() => setFlash(null), 2000);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Assortiment</h1>
          <p className="text-sm text-stone-600">Jouw inkoopprijs per eenheid, excl. btw. Verpakkingen per omdoos, bulk per kg.</p>
        </div>
        <div className="flex gap-2">
          <input placeholder="Zoek op naam of SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-stone-300 px-3 py-2 text-sm" />
          <select value={animal} onChange={(e) => setAnimal(e.target.value)} className="rounded border border-stone-300 px-3 py-2 text-sm">
            <option value="">Alle diersoorten</option>
            {animals.map((a) => <option key={a.animal} value={a.animal}>{a.animal} ({a.count})</option>)}
          </select>
        </div>
      </div>

      {flash && <div className="fixed bottom-6 right-6 rounded bg-stone-900 px-4 py-2 text-sm text-white shadow">{flash}</div>}

      {products === null ? <p className="mt-8 text-stone-500">Laden…</p> : products.length === 0 ? <p className="mt-8 text-stone-500">Geen producten gevonden.</p> : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-600">
              <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Eenheid</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Omdoos</th><th className="px-4 py-3">Voorraad</th><th className="px-4 py-3">Adviesprijs</th><th className="px-4 py-3">Jouw prijs</th><th className="px-4 py-3">Aantal</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {products.flatMap((p) => p.variants.map((v) => (
                <tr key={v.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded bg-stone-100" />}
                      <div><div className="font-medium">{p.title}</div><div className="text-xs text-stone-500">{p.animal}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded px-1.5 py-0.5 text-xs ${v.unitType === "BULK" ? "bg-stone-800 text-white" : "bg-stone-100"}`}>{UNIT_NL[v.unitType]}</span> <span className="ml-1">{v.packContent}</span></td>
                  <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                  <td className="px-4 py-3">{v.caseSize > 1 ? `${v.caseSize} st.` : "–"}</td>
                  <td className="px-4 py-3">{v.stock > 0 ? <span className="text-green-700">{v.stock}</span> : <span className="text-red-600">Uitverkocht</span>}</td>
                  <td className="px-4 py-3 text-stone-500">{v.retailPrice != null ? eur(v.retailPrice) : "–"}</td>
                  <td className="px-4 py-3">
                    {v.price == null ? <span className="text-stone-400">op aanvraag</span> : <>
                      <div className="font-semibold">{eur(v.price)}</div>
                      {v.tiers.filter((t) => t.minQty > 1).map((t) => <div key={t.minQty} className="text-xs text-stone-500">vanaf {t.minQty}: {eur(t.price)}</div>)}
                    </>}
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" min={v.caseSize} step={v.caseSize} value={qty[v.id] ?? v.caseSize} onChange={(e) => setQty({ ...qty, [v.id]: Number(e.target.value) })} className="w-20 rounded border border-stone-300 px-2 py-1" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button disabled={v.price == null} onClick={() => add(p, v)} className="rounded bg-amber-700 px-3 py-1.5 text-white hover:bg-amber-800 disabled:opacity-40">Toevoegen</button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
