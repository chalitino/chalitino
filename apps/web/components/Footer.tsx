import Link from "next/link";
import { brand, Seal, Strook, Wordmark } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-16 bg-wt-ink pt-10 text-[#e9dfcf]">
      <div className="wrap">
        <div className="grid grid-cols-[1fr_auto] items-center gap-6 border-b border-[#5a4a42] pb-7">
          <div>
            <Wordmark height={34} className="text-wt-soft" />
            <div className="mt-3 flex flex-wrap gap-x-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#c9b9a6]">
              {brand.tagline.map((t, i) => <span key={t}>{i > 0 && <span className="mr-4 text-wt-gold">·</span>}{t}</span>)}
            </div>
          </div>
          <div className="text-wt-gold"><Seal size={72} id="f" /></div>
        </div>
        <div className="grid gap-6 py-7 text-[13.5px] sm:grid-cols-2 lg:grid-cols-4">
          <div><b className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-wt-gold">{brand.legalName}</b>{brand.address.map((l) => <div key={l}>{l}</div>)}<div className="mt-2">{brand.email}<br />{brand.phone}</div></div>
          <div><b className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-wt-gold">Zakelijk</b>
            {[["/", "Assortiment"], ["/snelbestellen", "Snelbestellen"], ["/account", "Mijn account"], ["/aanvragen", "Account aanvragen"]].map(([h, l]) => <Link key={h} href={h} className="block py-0.5 text-[#f3eadb] hover:underline">{l}</Link>)}
          </div>
          <div><b className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-wt-gold">Klantenservice</b>
            {[["mailto:info@wicotreats.com", "Contact"], ["https://wicotreats.com/pages/verzending", "Verzending"], ["https://wicotreats.com/pages/retour", "Retour"], ["https://wicotreats.com/pages/handelsvoorwaarden", "Handelsvoorwaarden"]].map(([h, l]) => <a key={h} href={h} className="block py-0.5 text-[#f3eadb] hover:underline">{l}</a>)}
          </div>
          <div><b className="mb-2 block text-[10.5px] font-bold uppercase tracking-[0.14em] text-wt-gold">Betalen</b>
            <div className="flex flex-wrap gap-1.5">{brand.payments.map((p) => <span key={p} className="rounded-[2px] border border-[#6a594f] px-2 py-1 text-[11px] text-[#f3eadb]">{p}</span>)}</div>
            <p className="mt-3 text-[12.5px] text-[#c9b9a6]">Eerste twee orders vooruit, daarna 14 dagen op rekening.</p>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-6 border-t border-[#5a4a42] pb-3 pt-8 md:flex-row md:items-end">
          <Wordmark height={64} className="text-wt-soft" />
          <div className="font-display text-[clamp(20px,2.4vw,30px)] font-extrabold leading-tight text-wt-gold md:text-right">{brand.slogan}</div>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-[#5a4a42] py-4 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#c9b9a6]">
          <span>© {new Date().getFullYear()} {brand.legalName}</span><span>{brand.registrations}</span>
        </div>
      </div>
      <Strook className="mt-5" />
    </footer>
  );
}
