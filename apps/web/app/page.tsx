"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Product } from "@/lib/api";
import { animalColor } from "@/lib/brand";

/** Assortiment: diersoort-tegels (zoals de kaarten op wicotreats.com) die doorlinken naar de besteltabel. */
export default function AssortimentPage() {
  const [animals, setAnimals] = useState<{ animal: string; count: number }[] | null>(null);
  const [bulk, setBulk] = useState(0);
  useEffect(() => {
    api<{ animal: string; count: number }[]>("/catalog/animals").then(setAnimals).catch(() => setAnimals([]));
    api<Product[]>("/catalog/products").then((ps) => setBulk(ps.reduce((s, p) => s + p.variants.filter((v) => v.unitType === "BULK").length, 0))).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Assortiment</div>
        <h1 className="h1">Eén ingrediënt. <em>Tien diersoorten.</em></h1>
        <p className="lead mt-3.5">Gedroogde hondensnacks zonder toevoegingen, per karton of in bulk per kg. Kies een diersoort of ga direct naar snelbestellen voor het hele assortiment in één tabel.</p>
        <div className="mt-6 flex flex-wrap gap-2.5"><Link className="btn" href="/snelbestellen"><span>Snelbestellen</span><span>→</span></Link><Link className="btn ghost" href="/snelbestellen?eenheid=BULK"><span>Bulk per kg</span></Link></div>
      </div>
      {animals === null ? <p className="text-wt-mute">Laden…</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {animals.map((a) => (
            <Link key={a.animal} href={`/snelbestellen?dier=${encodeURIComponent(a.animal)}`} className="tile" style={{ "--c": animalColor(a.animal) } as React.CSSProperties}>
              <span className="wm">{a.animal}</span>
              <span className="t"><b>{a.animal}</b><span>{a.count} {a.count === 1 ? "product" : "producten"}</span></span>
            </Link>
          ))}
          <Link href="/snelbestellen?eenheid=BULK" className="tile" style={{ "--c": "#2e221e" } as React.CSSProperties}>
            <span className="wm">Bulk</span>
            <span className="t"><b>Bulk per kg</b><span>{bulk} artikelen · ongelabeld</span></span>
          </Link>
        </div>
      )}
      <div className="mt-12 grid gap-3 md:grid-cols-3">
        {[["Per karton", "Verpakkingen bestel je per karton van 12 of 20 zakjes. Bulk per kg, 1 kg per eenheid."], ["Batch en THT op de pakbon", "Elke regel vermeldt partij, THT en analyse van de geleverde partij — dezelfde code als op de zak."], ["Op rekening", "De eerste twee orders vooruit, daarna 14 dagen op rekening. Factuur bij verzending."]].map(([t, d]) => (
          <div key={t} className="notice"><b className="mb-1 block font-display text-[17px]">{t}</b><span className="text-wt-mute">{d}</span></div>
        ))}
      </div>
    </div>
  );
}
