import { brand, langFor, type Lang } from "../lib/brand.js";
import { prisma } from "../lib/prisma.js";
import { box, esc, eur, fmtDate, layout, mono, table } from "./layout.js";

type OrderForMail = Awaited<ReturnType<typeof loadOrder>>;

export async function loadOrder(orderId: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { company: true, lines: { include: { variant: { select: { caseSize: true } }, batches: { include: { batch: { select: { batchNumber: true, bestBefore: true, analysis: true } } } } } } },
  });
}

async function notifyEmail() {
  const s = await prisma.setting.findUnique({ where: { key: "orderNotifyEmail" } });
  return s?.value ?? brand.supportEmail;
}

// Tweetalige teksten (NL voor NL/BE, EN voor de rest), zoals in de Order Printer Pro-sjablonen.
const T = {
  nl: {
    dear: (n: string) => `Beste ${n},`,
    thanks: (no: number, ref: string | null, d: string) => `Bedankt voor uw bestelling. We hebben order <strong>#${no}</strong>${ref ? ` (uw PO-nr ${esc(ref)})` : ""} ontvangen op ${d}.`,
    cols: ["Artikel", "Aantal", "Prijs ex BTW", "Totaal ex BTW"],
    sub: "Subtotaal ex BTW", ship: "Verzendkosten", free: "Gratis", vat: "BTW", vatReverse: "verlegd", total: "Totaal",
    prepaidTitle: "Vooruitbetaling",
    prepaid: (amt: string, no: number, n: number) => `Dit is een van uw eerste bestellingen; we verzenden zodra de betaling is bijgeschreven. Gelieve <strong>${amt}</strong> over te maken naar IBAN ${mono(brand.iban)} · BIC ${mono(brand.bic)} t.n.v. ${brand.legalName}, onder vermelding van <strong>order #${no}</strong>. Na uw eerste ${n} betaalde bestellingen bestelt u op rekening.`,
    accountTitle: "Op rekening",
    account: (days: number, due: string) => `U ontvangt de factuur bij verzending. Betaling binnen ${days} dagen${due ? `, uiterlijk ${due}` : ""}.`,
    reverse: (v: string) => `BTW verlegd — art. 138 Richtlijn 2006/112/EG. Afnemer: ${v}.`,
    exportNote: "Levering buiten de EU: 0% BTW.",
    deliverTo: "Afleveren aan", yourNote: "Uw opmerking", follow: "U kunt de status van uw bestelling volgen in het portaal.",
    ctaOrders: "Bekijk uw orders", subjConfirm: (no: number) => `Orderbevestiging #${no} – WicoTreats`, titleConfirm: (no: number) => `Bedankt voor uw bestelling #${no}`,
    shippedTitle: (no: number) => `Uw order #${no} is onderweg`, shippedSubj: (no: number) => `Order #${no} is verzonden – WicoTreats`,
    shipped: (no: number) => `Uw order <strong>#${no}</strong> is vandaag verzonden naar:`, track: "Track & trace",
    invoiceNote: (nr: string, amt: string, due: string) => `De factuur ${mono(nr)} van ${amt} graag voldoen vóór ${due} onder vermelding van het factuurnummer.`,
    trace: "Elke regel op de pakbon vermeldt batchnummer, THT en de analyse van de geleverde partij — dezelfde code staat op de zak. Bewaar droog, koel en donker. Afwijkingen binnen 48 uur melden met batchnummer en foto.",
    regSubj: "Uw aanvraag voor een dealeraccount – WicoTreats", regTitle: "Aanvraag ontvangen",
    reg: "Bedankt voor uw aanvraag. We beoordelen deze binnen één werkdag en laten u per e-mail weten zodra uw account actief is. Daarna ziet u na inloggen direct uw inkoopprijzen.",
    apprSubj: "Uw dealeraccount is actief – WicoTreats", apprTitle: "Welkom bij WicoTreats B2B",
    appr: "Uw account is goedgekeurd. U kunt nu inloggen, het assortiment met uw inkoopprijzen bekijken en bestellen.", payTerms: "Betaalafspraak",
    apprPrepaid: (n: number, d: number) => `De eerste ${n} bestellingen betaalt u vooruit; daarna bestelt u op rekening met een betaaltermijn van ${d} dagen.`,
    apprAccount: (d: number) => `U bestelt op rekening met een betaaltermijn van ${d} dagen.`, login: "Inloggen",
  },
  en: {
    dear: (n: string) => `Dear ${n},`,
    thanks: (no: number, ref: string | null, d: string) => `Thank you for your order. We received order <strong>#${no}</strong>${ref ? ` (your PO no. ${esc(ref)})` : ""} on ${d}.`,
    cols: ["Item", "Qty", "Price excl. VAT", "Total excl. VAT"],
    sub: "Subtotal excl. VAT", ship: "Shipping", free: "Free", vat: "VAT", vatReverse: "reverse charged", total: "Total",
    prepaidTitle: "Prepayment",
    prepaid: (amt: string, no: number, n: number) => `This is one of your first orders; we ship as soon as payment is received. Please transfer <strong>${amt}</strong> to IBAN ${mono(brand.iban)} · BIC ${mono(brand.bic)} in the name of ${brand.legalName}, quoting <strong>order #${no}</strong>. After your first ${n} paid orders you can order on account.`,
    accountTitle: "On account",
    account: (days: number, due: string) => `You will receive the invoice on shipment. Payment within ${days} days${due ? `, by ${due}` : ""}.`,
    reverse: (v: string) => `VAT reverse charged — art. 138 Directive 2006/112/EC. Customer VAT no.: ${v}.`,
    exportNote: "Delivery outside the EU: 0% VAT.",
    deliverTo: "Deliver to", yourNote: "Your note", follow: "You can follow the status of your order in the portal.",
    ctaOrders: "View your orders", subjConfirm: (no: number) => `Order confirmation #${no} – WicoTreats`, titleConfirm: (no: number) => `Thank you for your order #${no}`,
    shippedTitle: (no: number) => `Your order #${no} is on its way`, shippedSubj: (no: number) => `Order #${no} has shipped – WicoTreats`,
    shipped: (no: number) => `Your order <strong>#${no}</strong> was shipped today to:`, track: "Track & trace",
    invoiceNote: (nr: string, amt: string, due: string) => `Please pay invoice ${mono(nr)} of ${amt} by ${due}, quoting the invoice number.`,
    trace: "Each line on the packing slip states the batch number, best-before date and analysis of the delivered lot — the same code is printed on the bag. Store dry, cool and dark. Report any discrepancy within 48 hours, quoting the batch number and a photo.",
    regSubj: "Your dealer account request – WicoTreats", regTitle: "Request received",
    reg: "Thank you for your request. We review it within one working day and will e-mail you as soon as your account is active. After logging in you will see your purchase prices.",
    apprSubj: "Your dealer account is active – WicoTreats", apprTitle: "Welcome to WicoTreats B2B",
    appr: "Your account has been approved. You can now log in, browse the range with your purchase prices and order.", payTerms: "Payment terms",
    apprPrepaid: (n: number, d: number) => `Your first ${n} orders are prepaid; after that you order on account with ${d}-day payment terms.`,
    apprAccount: (d: number) => `You order on account with ${d}-day payment terms.`, login: "Log in",
  },
};

function linesTable(o: OrderForMail, t: (typeof T)["nl"]) {
  return table(
    o.lines.map((l) => [`<strong>${esc(l.title)}</strong><br><span style="font-family:${brand.fonts.mono};font-size:11px;color:${brand.colors.muted};">${esc(l.sku)}</span>`, String(l.qty), eur(l.unitPriceExVat), eur(l.lineTotalExVat)]),
    { header: t.cols, alignRight: [1, 2, 3] },
  );
}

function totals(o: OrderForMail, t: (typeof T)["nl"]) {
  const vatCell = o.vatScheme === "EU_REVERSE_CHARGE" ? t.vatReverse : eur(o.vatTotal);
  return table([[t.sub, eur(o.subtotalExVat)], [t.ship, Number(o.shippingExVat) === 0 ? t.free : eur(o.shippingExVat)], [t.vat, vatCell], [`<strong>${t.total}</strong>`, `<strong>${eur(o.totalIncVat)}</strong>`]], { alignRight: [1] });
}

function address(o: OrderForMail) {
  return [o.company.name, o.shipStreet, `${o.shipPostcode ?? ""} ${o.shipCity ?? ""}`.trim(), o.shipCountry].filter(Boolean).map(esc).join("<br>");
}

/** 1. Orderbevestiging aan de dealer, met betaalinstructies (vooruit) of vervaldatum (op rekening). */
export async function orderConfirmation(o: OrderForMail) {
  const lang = langFor(o.company);
  const t = T[lang];
  const prepaid = o.paymentTerms === "PREPAID";
  const payment = prepaid
    ? box(`<strong>${t.prepaidTitle}</strong><br>${t.prepaid(eur(o.totalIncVat), o.number, o.company.prepaidOrders)}`, "warn")
    : box(`<strong>${t.accountTitle}</strong><br>${t.account(o.company.paymentTermDays, fmtDate(o.dueDate, lang))}`);
  const vatNote = o.vatScheme === "EU_REVERSE_CHARGE" ? `<p style="font-size:12px;color:${brand.colors.muted};">${t.reverse(esc(o.company.vatNumber))}</p>` : o.vatScheme === "EXPORT" ? `<p style="font-size:12px;color:${brand.colors.muted};">${t.exportNote}</p>` : "";
  const body = `
    <p>${t.dear(esc(o.company.name))}</p>
    <p>${t.thanks(o.number, o.reference, fmtDate(o.createdAt, lang))}</p>
    ${linesTable(o, t)}${totals(o, t)}${vatNote}${payment}
    <p style="margin-top:16px;"><strong>${t.deliverTo}</strong><br>${address(o)}</p>
    ${o.note ? `<p><strong>${t.yourNote}</strong><br>${esc(o.note)}</p>` : ""}
    <p>${t.follow}</p>`;
  const text = [
    `${t.titleConfirm(o.number)} (${fmtDate(o.createdAt, lang)})`,
    ...o.lines.map((l) => `- ${l.qty} x ${l.title} (${l.sku}): ${eur(l.lineTotalExVat)}`),
    `${t.sub} ${eur(o.subtotalExVat)} · ${t.ship} ${eur(o.shippingExVat)} · ${t.vat} ${eur(o.vatTotal)} · ${t.total} ${eur(o.totalIncVat)}`,
    prepaid ? `${t.prepaidTitle}: ${eur(o.totalIncVat)} → IBAN ${brand.iban} (${brand.legalName}), order #${o.number}` : `${t.accountTitle}: ${o.company.paymentTermDays} d.`,
  ].join("\n");
  return {
    to: o.company.email,
    subject: t.subjConfirm(o.number),
    html: layout({ lang, title: t.titleConfirm(o.number), preheader: prepaid ? `${t.prepaidTitle}: ${eur(o.totalIncVat)}` : `${t.total} ${eur(o.totalIncVat)}`, body, cta: { label: t.ctaOrders, url: `${brand.portalUrl}/orders` } }),
    text,
    replyTo: brand.supportEmail,
  };
}

/** Interne melding aan WicoTreats bij een nieuwe order, incl. toegewezen batch/THT. */
export async function newOrderInternal(o: OrderForMail) {
  const body = `
    <p>Nieuwe order <strong>#${o.number}</strong> van <strong>${esc(o.company.name)}</strong> (${esc(o.shipCountry)}) · ${o.paymentTerms === "PREPAID" ? "<strong>vooruitbetaling</strong>, wacht op bijschrijving" : "op rekening"} · ${o.vatScheme === "NL_VAT" ? "NL btw" : o.vatScheme === "EU_REVERSE_CHARGE" ? "btw verlegd" : "export 0%"}.</p>
    ${table(
      o.lines.map((l) => [esc(l.title), String(l.qty), l.batches.map((b) => `${mono(b.batch.batchNumber)} × ${b.qty} · THT ${fmtDate(b.batch.bestBefore)}`).join("<br>") || "<em>geen batch</em>"]),
      { header: ["Artikel", "Aantal", "Partij / THT"], alignRight: [1] },
    )}
    <p>Totaal ${eur(o.totalIncVat)}.${o.note ? `<br>Opmerking klant: ${esc(o.note)}` : ""}</p>`;
  return {
    to: await notifyEmail(),
    subject: `Nieuwe B2B-order #${o.number} – ${o.company.name}`,
    html: layout({ lang: "nl", title: `Nieuwe order #${o.number}`, body, cta: { label: "Open in beheer", url: `${brand.portalUrl}/beheer/orders/${o.id}` } }),
    text: `Nieuwe order #${o.number} van ${o.company.name}, totaal ${eur(o.totalIncVat)}. ${brand.portalUrl}/beheer/orders/${o.id}`,
  };
}

/** Verzendbevestiging met track & trace en factuurnummer. */
export async function orderShipped(o: OrderForMail) {
  const lang = langFor(o.company);
  const t = T[lang];
  const track = o.trackingCode ? box(`<strong>${t.track}</strong><br>${o.trackingUrl ? `<a href="${o.trackingUrl}" style="color:${brand.colors.accent};">${mono(o.trackingCode)}</a>` : mono(o.trackingCode)}`) : "";
  const inv = o.paymentTerms === "ON_ACCOUNT" && o.dueDate && o.invoiceNumber ? `<p>${t.invoiceNote(o.invoiceNumber, eur(o.totalIncVat), fmtDate(o.dueDate, lang))}</p>` : "";
  const body = `<p>${t.dear(esc(o.company.name))}</p><p>${t.shipped(o.number)}</p><p>${address(o)}</p>${track}${linesTable(o, t)}${inv}<p style="font-size:12px;color:${brand.colors.muted};">${t.trace}</p>`;
  return {
    to: o.company.email,
    subject: t.shippedSubj(o.number),
    html: layout({ lang, title: t.shippedTitle(o.number), preheader: o.trackingCode ? `${t.track} ${o.trackingCode}` : undefined, body, cta: { label: t.ctaOrders, url: `${brand.portalUrl}/orders` } }),
    text: `${t.shippedTitle(o.number)}.${o.trackingCode ? ` ${t.track}: ${o.trackingCode}` : ""}`,
    replyTo: brand.supportEmail,
  };
}

/** Aanvraag ontvangen (dealer) + melding aan WicoTreats. */
export async function registrationReceived(company: { id: string; name: string; email: string; shipCountry: string; locale?: string | null; vatNumber: string | null; kvkNumber: string | null }) {
  const lang = langFor(company);
  const t = T[lang];
  const dealer = { to: company.email, subject: t.regSubj, html: layout({ lang, title: t.regTitle, body: `<p>${t.dear(esc(company.name))}</p><p>${t.reg}</p>` }), text: t.reg, replyTo: brand.supportEmail };
  const internal = {
    to: await notifyEmail(),
    subject: `Nieuwe dealeraanvraag: ${company.name}`,
    html: layout({ lang: "nl", title: "Nieuwe dealeraanvraag", body: `<p><strong>${esc(company.name)}</strong> (${esc(company.shipCountry)})<br>${esc(company.email)}<br>BTW: ${esc(company.vatNumber ?? "–")} · KvK: ${esc(company.kvkNumber ?? "–")}</p><p>Keur de aanvraag goed in het beheer. Controleer voor EU-klanten het btw-nummer (VIES) zodat btw verlegd wordt toegepast.</p>`, cta: { label: "Naar klanten", url: `${brand.portalUrl}/beheer/klanten` } }),
    text: `Nieuwe dealeraanvraag van ${company.name} (${company.email}). ${brand.portalUrl}/beheer/klanten`,
  };
  return { dealer, internal };
}

/** Account goedgekeurd. */
export function accountApproved(company: { name: string; email: string; shipCountry: string; locale?: string | null; prepaidOrders: number; paymentTermDays: number }) {
  const lang = langFor(company);
  const t = T[lang];
  return {
    to: company.email,
    subject: t.apprSubj,
    html: layout({ lang, title: t.apprTitle, body: `<p>${t.dear(esc(company.name))}</p><p>${t.appr}</p>${box(`<strong>${t.payTerms}</strong><br>${company.prepaidOrders > 0 ? t.apprPrepaid(company.prepaidOrders, company.paymentTermDays) : t.apprAccount(company.paymentTermDays)}`)}`, cta: { label: t.login, url: `${brand.portalUrl}/login` } }),
    text: `${t.appr} ${brand.portalUrl}/login`,
    replyTo: brand.supportEmail,
  };
}
