// Pakbon en factuur als printbare HTML in de WicoTreats-huisstijl (1:1 naar de Order Printer Pro-sjablonen).
// Tweetalig: NL voor NL/BE, EN voor de rest.
import { brand, langFor, logoSvg, LOGO_COLORS, type Lang } from "./brand.js";
import type { loadOrder } from "../emails/templates.js";
import { esc, eur } from "../emails/layout.js";

type Order = Awaited<ReturnType<typeof loadOrder>>;
const d = (x: Date | string | null | undefined) => (x ? new Date(x).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

const css = () => {
  const c = brand.colors;
  const f = brand.fonts;
  return `
  @import url('${f.importUrl}');
  @page{size:A4;margin:0}
  body{margin:0;background:#fff}
  .wt{font-family:${f.body};color:${c.text};font-size:11px;line-height:1.5;background:#fff;max-width:794px;margin:0 auto}
  .wt *{box-sizing:border-box}
  .wt .mono{font-family:${f.mono}}
  .wt .band{background:${c.cream};padding:26px 32px 20px;display:flex;justify-content:space-between;align-items:flex-end}
  .wt .wm{font-family:${f.display};font-weight:800;font-size:30px;line-height:1;color:${c.text};letter-spacing:-.01em}
  .wt .lbl{font-weight:700;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:${c.muted};margin-bottom:5px}
  .wt .band .lbl{margin:8px 0 0}
  .wt .doc{text-align:right}
  .wt .doc h1{margin:0;font-family:${f.display};font-weight:800;font-size:34px;line-height:1;color:${c.text}}
  .wt .doc .nr{font-family:${f.mono};font-size:11px;color:${c.accent};margin-top:6px}
  .wt .strook{display:flex;height:7px}.wt .strook i{flex:1;display:block}
  .wt .body{padding:22px 32px 26px}
  .wt .meta{display:flex;gap:22px}.wt .meta>div{flex:1}
  .wt .kv{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;font-size:11px}.wt .kv b{font-weight:700}
  .wt table{width:100%;border-collapse:collapse;margin-top:22px;font-variant-numeric:tabular-nums}
  .wt th{font-weight:700;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:${c.muted};text-align:left;padding:8px 6px;border-bottom:1.5px solid ${c.text}}
  .wt td{padding:8px 6px;border-bottom:1px solid ${c.border};vertical-align:top}
  .wt .n{text-align:right;white-space:nowrap}
  .wt td small{display:block;font-family:${f.mono};font-size:9px;color:${c.muted};margin-top:2px}
  .wt .tot{margin-left:auto;width:300px;margin-top:14px}
  .wt .tot div{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${c.border}}
  .wt .tot div.g{border-bottom:0;border-top:1.5px solid ${c.text};margin-top:4px;font-family:${f.display};font-weight:800;font-size:17px;padding-top:9px}
  .wt .ids{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;margin-top:18px;border:1px solid ${c.border};border-radius:2px;background:${c.cream}}
  .wt .ids>div{padding:8px 12px;border-left:1px solid ${c.border}}.wt .ids>div:first-child{border-left:0}
  .wt .ids .lbl{margin-bottom:2px}.wt .ids .v{font-family:${f.mono};font-size:11px;min-height:15px}
  .wt .notes{margin-top:16px;border:1px solid ${c.border};border-radius:2px;padding:9px 12px;min-height:62px;background:${c.cream}}
  .wt .pay{margin-top:20px;border:1px solid ${c.border};border-left:5px solid ${c.accentSoft};padding:12px 14px;background:${c.cream};border-radius:2px}
  .wt .pay b{display:block;margin-bottom:3px}
  .wt .foot{margin-top:24px;padding-top:12px;border-top:1px solid ${c.border};display:flex;justify-content:space-between;align-items:center;gap:16px}
  .wt .foot .cols{font-weight:700;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:${c.muted};line-height:1.7}
  .wt .foot .slogan{font-family:${f.display};font-weight:800;font-size:15px;color:${c.accent};white-space:nowrap}
  .wt .tag{display:inline-block;font-weight:700;font-size:8px;letter-spacing:.12em;text-transform:uppercase;border:1.5px solid ${c.text};border-radius:2px;padding:3px 6px;margin-left:8px;vertical-align:middle}
  .wt .tag.red{border-color:${c.red};color:${c.red}}
  .wt .chip{display:inline-block;font-family:${f.mono};font-size:9px;border:1px solid ${c.accent};color:${c.accent};border-radius:2px;padding:2px 6px;margin:1px 4px 1px 0;white-space:nowrap}
  .wt .chk{display:inline-block;width:12px;height:12px;border:1.5px solid ${c.text};border-radius:2px;vertical-align:middle}
  .wt .sign{display:flex;gap:22px;margin-top:22px}
  .wt .sign>div{flex:1;border-top:1.5px solid ${c.text};padding-top:6px;font-weight:700;font-size:7.5px;color:${c.muted};text-transform:uppercase;letter-spacing:.14em;height:50px}
  .wt .seal{width:58px;height:58px;flex:none}.wt .seal text{font-weight:700}.wt .seal .w{font-family:${f.display};font-weight:800}
  .print{position:fixed;bottom:16px;right:16px;box-shadow:0 2px 8px rgba(74,57,51,.15);font-family:${f.body};font-size:12px;padding:8px 14px;border:1.5px solid ${c.text};background:#fff;border-radius:2px;cursor:pointer}
  @media print{.print{display:none}}`;
};

const strook = () => `<div class="strook">${brand.colors.strip.map((c) => `<i style="background:${c}"></i>`).join("")}</div>`;
const seal = (lang: Lang) => `<svg class="seal" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="none" stroke="${brand.colors.accent}" stroke-width="2"/><circle cx="60" cy="60" r="41" fill="none" stroke="${brand.colors.accent}" stroke-width="1.2"/><text x="60" y="15" text-anchor="middle" font-size="7.4" letter-spacing="1.6" fill="${brand.colors.accent}">WICOTREATS · SWALMEN</text><text class="w" x="60" y="72" text-anchor="middle" font-size="36" fill="${brand.colors.text}">W</text><text x="60" y="110" text-anchor="middle" font-size="6.6" letter-spacing="1.3" fill="${brand.colors.accent}">${lang === "en" ? "SINCE 1993" : "SINDS 1993"} · NVWA ${brand.nvwa}</text></svg>`;
const page = (lang: Lang, title: string, inner: string) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css()}</style></head><body><button class="print" onclick="window.print()">${lang === "en" ? "Print / save as PDF" : "Printen / opslaan als PDF"}</button><div class="wt">${inner}</div></body></html>`;

const addr = (o: Order) => `<b>${esc(o.company.name)}</b><br>${esc(o.shipStreet)}<br>${esc(o.shipPostcode)} ${esc(o.shipCity)}<br>${esc(o.shipCountry)}${o.company.phone ? `<br><span class="mono">${esc(o.company.phone)}</span>` : ""}`;
const invoiceAddr = (o: Order) => `<b>${esc(o.company.name)}</b><br>${esc(o.company.invoiceStreet)}<br>${esc(o.company.invoicePostcode)} ${esc(o.company.invoiceCity)}<br>${esc(o.company.invoiceCountry)}`;
const ids = (o: Order, t: { vatcust: string; coccust: string; vatwico: string; cocwico: string }) => `<div class="ids">
  <div><div class="lbl">${t.vatcust}</div><div class="v">${esc(o.company.vatNumber ?? "—")}</div></div>
  <div><div class="lbl">${t.coccust}</div><div class="v">${esc(o.company.kvkNumber ?? "—")}</div></div>
  <div><div class="lbl">${t.vatwico}</div><div class="v">${brand.vat}</div></div>
  <div><div class="lbl">${t.cocwico}</div><div class="v">${brand.kvk}</div></div></div>`;
const foot = (lang: Lang, line2: string, slogan: string) => `<div class="foot"><div class="cols">${esc(brand.footerLine1)}<br>${esc(line2)}</div><div class="slogan">${esc(slogan)}</div>${seal(lang)}</div>`;

/** PAKBON: per regel partij, THT en analyse; vinkvakjes; handtekeningvelden. */
export function pakbonHtml(o: Order) {
  const lang = langFor(o.company);
  const t = lang === "en"
    ? { doc: "Packing slip.", deliverto: "Deliver to", order: "Order", orderno: "Order no.", po: "Your PO no.", orderdate: "Order date", shipping: "Shipping", carrier: "Sendcloud", lines: "Lines", pcs: "pcs", invoice: "Invoice", trace: "Traceability", tracetxt: "Each line states the batch number, best-before date and analysis of the delivered lot — the same code is printed on the bag. Store dry, cool and dark. Report any discrepancy within 48 hours, quoting the batch number and a photo.", item: "Item", sku: "Item no.", qty: "Qty", lot: "Lot · best before · analysis", cartons: "carton(s) of", bags: "bags", batch: "Batch", bbd: "BBD", seebag: "Batch / BBD: see bag", notes: "Notes", note: "Customer note", packed: "Packed by / date", checked: "Checked by", received: "Received by / date / signature", foot2: `Complementary feed for dogs · not for human consumption · Reg. no. (KvK) ${brand.kvk} · NVWA ${brand.nvwa}`, vatcust: "Customer VAT no.", coccust: "Customer reg. no.", vatwico: "VAT no. WicoTreats", cocwico: "Reg. no. (KvK) WicoTreats" }
    : { doc: "Pakbon.", deliverto: "Afleveren aan", order: "Order", orderno: "Ordernr", po: "Uw PO-nr", orderdate: "Orderdatum", shipping: "Verzending", carrier: "Sendcloud", lines: "Regels", pcs: "stuks", invoice: "Factuur", trace: "Traceerbaarheid", tracetxt: "Elke regel vermeldt batchnummer, THT en de analyse van de geleverde partij — dezelfde code staat op de zak. Bewaar droog, koel en donker. Afwijkingen binnen 48 uur melden met batchnummer en foto.", item: "Artikel", sku: "Art.nr", qty: "Aantal", lot: "Partij · THT · analyse", cartons: "karton(s) à", bags: "zakjes", batch: "Batch", bbd: "THT", seebag: "Batch / THT: zie zak", notes: "Notities", note: "Opmerking klant", packed: "Ingepakt door / datum", checked: "Gecontroleerd door", received: "Ontvangen door / datum / handtekening", foot2: `Aanvullend diervoeder voor honden · niet voor menselijke consumptie · KvK ${brand.kvk} · NVWA ${brand.nvwa}`, vatcust: "BTW-nr afnemer", coccust: "KvK-nr afnemer", vatwico: "BTW-nr WicoTreats", cocwico: "KvK-nr WicoTreats" };
  const pcs = o.lines.reduce((s, l) => s + l.qty, 0);
  const rows = o.lines.map((l) => {
    const cs = l.variant?.caseSize;
    const lot = l.batches.length
      ? l.batches.map((b) => {
          let an = b.batch.analysis ?? "";
          if (lang === "en") an = an.replace("Vocht", "Moisture").replace(/\bE /, "Protein ").replace(/\bV /, "Fat ").replace(/\bA /, "Ash ");
          return `<span class="chip">${t.batch} ${esc(b.batch.batchNumber)}</span><span class="chip">${t.bbd} ${d(b.batch.bestBefore)}</span>${l.batches.length > 1 ? `<span class="mono" style="font-size:9px;color:${brand.colors.muted}">× ${b.qty}</span>` : ""}${an ? `<br><span class="mono" style="font-size:9px;color:${brand.colors.muted}">${esc(an)}</span>` : ""}`;
        }).join("<br>")
      : `<span class="mono" style="font-size:9px;color:${brand.colors.muted}">${t.seebag}</span>`;
    return `<tr><td><span class="chk"></span></td><td><b>${esc(l.title)}</b>${cs && cs > 1 && l.qty % cs === 0 ? `<small>${l.qty / cs} ${t.cartons} ${cs} ${t.bags}</small>` : ""}</td><td class="mono">${esc(l.sku)}</td><td class="n"><b>${l.qty}</b></td><td>${lot}</td></tr>`;
  }).join("");
  return page(lang, `${t.doc} #${o.number}`, `
  <div class="band"><div>${logoSvg(LOGO_COLORS.bruun, 34)}<div class="lbl">${esc(brand.tagline[lang])}</div></div><div class="doc"><h1>${t.doc}</h1><div class="nr">#${o.number} · ${d(o.createdAt)}</div></div></div>${strook()}
  <div class="body">
    <div class="meta">
      <div><div class="lbl">${t.deliverto}</div>${addr(o)}</div>
      <div><div class="lbl">${t.order}</div><div class="kv"><b>${t.orderno}</b><span class="mono">#${o.number}</span>${o.reference ? `<b>${t.po}</b><span class="mono">${esc(o.reference)}</span>` : ""}<b>${t.orderdate}</b><span class="mono">${d(o.createdAt)}</span><b>${t.shipping}</b><span>${t.carrier}${o.trackingCode ? ` · <span class="mono">${esc(o.trackingCode)}</span>` : ""}</span><b>${t.lines}</b><span class="mono">${o.lines.length} · ${pcs} ${t.pcs}</span>${o.invoiceNumber ? `<b>${t.invoice}</b><span class="mono">${esc(o.invoiceNumber)}</span>` : ""}</div></div>
      <div><div class="lbl">${t.trace}</div>${t.tracetxt}</div>
    </div>
    ${ids(o, t)}
    <table><thead><tr><th style="width:22px"></th><th>${t.item}</th><th>${t.sku}</th><th class="n">${t.qty}</th><th>${t.lot}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="notes"><div class="lbl">${t.notes}${o.note ? ` · ${t.note}` : ""}</div>${esc(o.note ?? "")}</div>
    <div class="sign"><div>${t.packed}</div><div>${t.checked}</div><div>${t.received}</div></div>
    ${foot(lang, t.foot2, brand.slogan[lang])}
  </div>`);
}

/** FACTUUR: btw per regel of verlegd, betaalinstructies, betaald-stempel. */
export function factuurHtml(o: Order) {
  const lang = langFor(o.company);
  const t = lang === "en"
    ? { doc: "Invoice.", paid: "Paid", cancelled: "Cancelled", billto: "Bill to", shipto: "Ship to", details: "Details", invno: "Invoice no.", orderno: "Order no.", invdate: "Invoice date", po: "Your PO no.", terms: "Payment terms", due: "Due date", custno: "Customer no.", item: "Item", sku: "Item no.", qty: "Qty", price: "Price excl. VAT", vat: "VAT", total: "Total excl. VAT", reverse: "reverse charged", sub: "Subtotal excl. VAT", ship: "Shipping", topay: "Total due", paidtxt: "This invoice has been paid", on: "on", keep: "Please keep this document for your records.", payment: "Payment", please: "Please transfer", quoting: "quoting", within: "within the payment terms", inname: "in the name of", rc: "VAT reverse charged — art. 138 Directive 2006/112/EC. Customer VAT no.:", exp: "Export outside the EU — 0% VAT.", prepaid: "prepayment", account: (n: number) => `${n} days`, foot2: `Reg. no. (KvK) ${brand.kvk} · VAT ${brand.vat} · NVWA approval ${brand.nvwa} · Terms: ${brand.termsUrl}`, notes: "Notes", vatcust: "Customer VAT no.", coccust: "Customer reg. no.", vatwico: "VAT no. WicoTreats", cocwico: "Reg. no. (KvK) WicoTreats" }
    : { doc: "Factuur.", paid: "Betaald", cancelled: "Geannuleerd", billto: "Factuuradres", shipto: "Afleveradres", details: "Gegevens", invno: "Factuurnr", orderno: "Ordernr", invdate: "Factuurdatum", po: "Uw PO-nr", terms: "Betaaltermijn", due: "Vervaldatum", custno: "Klantnr", item: "Artikel", sku: "Art.nr", qty: "Aantal", price: "Prijs ex BTW", vat: "BTW", total: "Totaal ex BTW", reverse: "verlegd", sub: "Subtotaal ex BTW", ship: "Verzendkosten", topay: "Totaal te betalen", paidtxt: "Deze factuur is voldaan", on: "op", keep: "Bewaar dit document voor uw administratie.", payment: "Betaling", please: "Gelieve", quoting: "over te maken onder vermelding van", within: "binnen de betaaltermijn", inname: "t.n.v.", rc: "BTW verlegd / VAT reverse charged — art. 138 Richtlijn 2006/112/EG. Afnemer:", exp: "Export buiten de EU — 0% BTW.", prepaid: "vooruitbetaling", account: (n: number) => `${n} dagen`, foot2: `KvK ${brand.kvk} · BTW ${brand.vat} · NVWA-erkenning ${brand.nvwa} · Handelsvoorwaarden: ${brand.termsUrl}`, notes: "Notities", vatcust: "BTW-nr afnemer", coccust: "KvK-nr afnemer", vatwico: "BTW-nr WicoTreats", cocwico: "KvK-nr WicoTreats" };
  const verlegd = o.vatScheme === "EU_REVERSE_CHARGE";
  const nr = o.invoiceNumber ?? `#${o.number}`;
  const invDate = o.invoicedAt ?? o.createdAt;
  const termijn = o.paymentTerms === "PREPAID" ? t.prepaid : t.account(o.company.paymentTermDays);
  const rows = o.lines.map((l) => `<tr><td><b>${esc(l.title)}</b></td><td class="mono">${esc(l.sku)}</td><td class="n">${l.qty}</td><td class="n">${eur(l.unitPriceExVat)}</td><td class="n">${verlegd ? t.reverse : `${Number(l.vatRate)} %`}</td><td class="n">${eur(l.lineTotalExVat)}</td></tr>`).join("");
  const vatRows = verlegd ? `<div><span>${t.vat}</span><span class="mono">${t.reverse}</span></div>` : (() => {
    const groups = new Map<number, number>();
    for (const l of o.lines) groups.set(Number(l.vatRate), (groups.get(Number(l.vatRate)) ?? 0) + Number(l.lineTotalExVat) * Number(l.vatRate) / 100);
    if (Number(o.shippingExVat) > 0 && o.vatScheme === "NL_VAT") groups.set(21, (groups.get(21) ?? 0) + Number(o.shippingExVat) * 0.21);
    return [...groups.entries()].map(([r, v]) => `<div><span>${t.vat} ${r} %</span><span class="mono">${eur(v)}</span></div>`).join("");
  })();
  const pay = o.paymentStatus === "PAID"
    ? `<b>${t.paidtxt}${o.paidAt ? ` ${t.on} ${d(o.paidAt)}` : ""}.</b> ${t.keep}`
    : `<b>${t.payment}</b> ${t.please} ${eur(o.totalIncVat)} ${t.quoting} <span class="mono">${esc(nr)}</span>${o.reference ? ` / PO ${esc(o.reference)}` : ""}, ${t.within} (${termijn}).<br>IBAN <span class="mono">${brand.iban}</span> · BIC <span class="mono">${brand.bic}</span> · ${t.inname} ${brand.legalName}`;
  return page(lang, `${t.doc} ${nr}`, `
  <div class="band"><div>${logoSvg(LOGO_COLORS.bruun, 34)}<div class="lbl">${esc(brand.tagline[lang])}</div></div><div class="doc"><h1>${t.doc}${o.paymentStatus === "PAID" ? `<span class="tag">${t.paid}</span>` : o.status === "CANCELLED" ? `<span class="tag red">${t.cancelled}</span>` : ""}</h1><div class="nr">${esc(nr)} · ${d(invDate)}</div></div></div>${strook()}
  <div class="body">
    <div class="meta">
      <div><div class="lbl">${t.billto}</div>${invoiceAddr(o)}</div>
      <div><div class="lbl">${t.shipto}</div>${addr(o)}</div>
      <div><div class="lbl">${t.details}</div><div class="kv"><b>${t.invno}</b><span class="mono">${esc(nr)}</span><b>${t.orderno}</b><span class="mono">#${o.number}</span><b>${t.invdate}</b><span class="mono">${d(invDate)}</span>${o.reference ? `<b>${t.po}</b><span class="mono">${esc(o.reference)}</span>` : ""}<b>${t.terms}</b><span>${termijn}</span>${o.dueDate ? `<b>${t.due}</b><span class="mono">${d(o.dueDate)}</span>` : ""}<b>${t.custno}</b><span class="mono">${esc(o.company.id)}</span></div></div>
    </div>
    ${ids(o, t)}
    <table><thead><tr><th>${t.item}</th><th>${t.sku}</th><th class="n">${t.qty}</th><th class="n">${t.price}</th><th class="n">${t.vat}</th><th class="n">${t.total}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tot"><div><span>${t.sub}</span><span class="mono">${eur(o.subtotalExVat)}</span></div><div><span>${t.ship}</span><span class="mono">${eur(o.shippingExVat)}</span></div>${vatRows}<div class="g"><span>${t.topay}</span><span>${eur(o.totalIncVat)}</span></div></div>
    <div class="pay">${pay}${verlegd ? `<br><span class="mono">${t.rc} ${esc(o.company.vatNumber)}.</span>` : o.vatScheme === "EXPORT" ? `<br><span class="mono">${t.exp}</span>` : ""}</div>
    <div class="notes"><div class="lbl">${t.notes}</div>${esc(o.note ?? "")}</div>
    ${foot(lang, t.foot2, brand.sloganInvoice)}
  </div>`);
}
