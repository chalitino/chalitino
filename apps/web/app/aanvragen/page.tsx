"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

const COUNTRIES: [string, string][] = [["NL", "Nederland"], ["BE", "België"], ["DE", "Duitsland"], ["FR", "Frankrijk"], ["LU", "Luxemburg"], ["AT", "Oostenrijk"], ["DK", "Denemarken"], ["SE", "Zweden"], ["ES", "Spanje"], ["IT", "Italië"], ["PL", "Polen"], ["GB", "Verenigd Koninkrijk"], ["CH", "Zwitserland"], ["NO", "Noorwegen"]];

export default function RegisterPage() {
  const [types, setTypes] = useState<string[]>([]);
  const [f, setF] = useState<Record<string, string>>({ country: "NL", companyType: "" });
  const [accept, setAccept] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<string[]>("/auth/company-types").then((t) => { setTypes(t); setF((x) => ({ ...x, companyType: t[0] })); }).catch(() => {}); }, []);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const r = await api<{ message: string }>("/auth/register", { method: "POST", body: JSON.stringify({ ...f, acceptTerms: accept }) });
      setDone(r.message);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="page-head">
        <div className="eyebrow">Zakelijk account</div>
        <h1 className="h1">Account aanvragen. <em>Binnen één werkdag</em> goedgekeurd.</h1>
        <p className="lead mt-3.5">Alleen voor bedrijven: dierenspeciaalzaken, groothandels, online retailers, merken en hondenprofessionals. Na goedkeuring zie je netto-prijzen en bestel je per karton.</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-14">
        <div>
          <div className="mb-7 grid gap-2.5 sm:grid-cols-3">
            {[["1 · Aanvragen", "Twee minuten: bedrijfsgegevens en contactpersoon. Geen wachtwoord nodig."], ["2 · Beoordeling", "We controleren KvK en BTW-nummer. Binnen één werkdag bericht per e-mail."], ["3 · Inloggen en bestellen", "Je logt in met je e-mailadres en een eenmalige code. Netto-prijzen zichtbaar, snelbestellen open."]].map(([t, d], i) => (
              <div key={t} className={`rounded-[2px] border p-3.5 text-[13px] ${i === 0 ? "border-wt-ink bg-wt-soft" : "border-wt-line bg-wt-bg text-wt-mute"}`}><b className="mb-1 block font-display text-[15px] text-wt-ink">{t}</b>{d}</div>
            ))}
          </div>
          {done ? <div className="notice ok"><b>Aanvraag ontvangen.</b><br />{done} Daarna log je in met dat e-mailadres (je ontvangt een eenmalige code, geen wachtwoord nodig) en zie je direct netto-prijzen.</div> : (
            <form className="form max-w-2xl" onSubmit={submit}>
              <fieldset><legend>Bedrijf</legend>
                <div className="two"><label>Bedrijfsnaam<input required autoComplete="organization" value={f.companyName ?? ""} onChange={set("companyName")} /></label><label>Type bedrijf<select required value={f.companyType} onChange={set("companyType")}>{types.map((t) => <option key={t}>{t}</option>)}</select></label></div>
                <div className="two"><label>Land<select value={f.country} onChange={set("country")}>{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
                  <label>KvK- / registratienummer<input required={f.country === "NL"} value={f.kvkNumber ?? ""} onChange={set("kvkNumber")} /></label></div>
                <label>BTW-nummer<input placeholder="NL001234567B01" required={f.country !== "NL"} value={f.vatNumber ?? ""} onChange={set("vatNumber")} /><small>EU-klanten buiten NL: geldig nummer = BTW verlegd.</small></label>
                <label>Website of Instagram (optioneel)<input placeholder="https://" value={f.website ?? ""} onChange={set("website")} /></label>
              </fieldset>
              <fieldset><legend>Contactpersoon</legend>
                <div className="two"><label>Naam<input required autoComplete="name" value={f.contactName ?? ""} onChange={set("contactName")} /></label><label>Telefoon<input type="tel" required autoComplete="tel" value={f.phone ?? ""} onChange={set("phone")} /></label></div>
                <label>E-mail (hiermee log je straks in)<input type="email" required autoComplete="email" value={f.email ?? ""} onChange={set("email")} /></label>
              </fieldset>
              <fieldset><legend>Afleveradres</legend>
                <label>Straat en huisnummer<input required autoComplete="street-address" value={f.street ?? ""} onChange={set("street")} /></label>
                <div className="three"><label>Plaats<input required value={f.city ?? ""} onChange={set("city")} /></label><label>Postcode<input required value={f.postcode ?? ""} onChange={set("postcode")} /></label><label>Land<input readOnly value={COUNTRIES.find(([c]) => c === f.country)?.[1] ?? f.country} /></label></div>
              </fieldset>
              <fieldset><legend>Overig</legend>
                <label>Hoe ken je ons? (optioneel)<input placeholder="beurs, collega, Instagram, Faire…" value={f.howFound ?? ""} onChange={set("howFound")} /></label>
                <label>Opmerking (optioneel)<textarea rows={3} placeholder="Waar ben je naar op zoek? Private label, bulk, eigen schap?" value={f.note ?? ""} onChange={set("note")} /></label>
                <label className="check"><input type="checkbox" required checked={accept} onChange={(e) => setAccept(e.target.checked)} /><span>Ik ga akkoord met de <a href="https://wicotreats.com/pages/handelsvoorwaarden" className="underline" target="_blank" rel="noreferrer">handelsvoorwaarden</a> en vraag een zakelijk account aan namens bovenstaand bedrijf.</span></label>
              </fieldset>
              {error && <div className="notice bad whitespace-pre-line">{error}</div>}
              <div className="flex flex-wrap items-center gap-4"><button className="btn" disabled={busy}><span>Account aanvragen</span><span>→</span></button><small className="text-wt-mute">Al goedgekeurd? <Link href="/login" className="underline">Inloggen met e-mailcode</Link></small></div>
            </form>
          )}
        </div>
        <aside className="grid h-fit gap-3">
          <div className="notice soft"><b>Wat we controleren</b><br />Inschrijving KvK (of buitenlands register) en het BTW-nummer via VIES. Particuliere aanvragen keuren we af — consumenten verwijzen we naar BRUUN.</div>
          <div className="notice soft"><b>Na goedkeuring</b><br />Inloggen met je e-mailadres (eenmalige code, geen wachtwoord) · netto-prijzen ex BTW · bestellen per karton · snelbestellen · facturen en pakbonnen met batch en THT.</div>
          <div className="notice soft"><b>Eerste orders</b><br />De eerste twee orders vooruitbetalen via overboeking. Daarna standaard 14 dagen op rekening.</div>
          <div className="notice soft">Liever eerst even bellen of een prijslijst ontvangen? Mail <a href="mailto:info@wicotreats.com" className="underline">info@wicotreats.com</a>.</div>
        </aside>
      </div>
    </div>
  );
}
