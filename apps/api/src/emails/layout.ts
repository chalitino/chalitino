import { brand, strip, type Lang } from "../lib/brand.js";

export const eur = (n: number | string | { toString(): string }) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n));
export const fmtDate = (d: Date | string | null | undefined, lang: Lang = "nl") =>
  d ? new Date(d).toLocaleDateString(lang === "nl" ? "nl-NL" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Tabel-gebaseerde e-mail in WicoTreats-huisstijl: crème kopband, kleurstrook, warm bruin, roest-accent. */
export function layout(opts: { lang: Lang; title: string; preheader?: string; body: string; cta?: { label: string; url: string } }) {
  const c = brand.colors;
  const f = brand.fonts;
  const header = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${esc(brand.companyName)}" width="300" height="36" style="display:block;width:300px;height:36px;">`
    : `<span style="font-family:${f.display};font-weight:800;font-size:28px;line-height:1;color:${c.text};letter-spacing:-0.01em;">${esc(brand.companyName)}</span>`;
  const footer2 = opts.lang === "nl"
    ? `Aanvullend diervoeder voor honden · niet voor menselijke consumptie · KvK ${brand.kvk} · BTW ${brand.vat} · NVWA ${brand.nvwa}`
    : `Complementary feed for dogs · not for human consumption · Reg. no. (KvK) ${brand.kvk} · VAT ${brand.vat} · NVWA ${brand.nvwa}`;
  return `<!doctype html>
<html lang="${opts.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(opts.title)}</title>
<style>@import url('${f.importUrl}');</style></head>
<body style="margin:0;padding:0;background:${c.cream};font-family:${f.body};color:${c.text};">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${c.cream};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${c.surface};border:1px solid ${c.border};border-radius:2px;overflow:hidden;">
  <tr><td style="background:${c.cream};padding:26px 32px 18px;">
    ${header}
    <div style="font-family:${f.body};font-weight:700;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:${c.muted};margin-top:8px;">${esc(brand.tagline[opts.lang])}</div>
  </td></tr>
  <tr><td style="padding:0;">${strip()}</td></tr>
  <tr><td style="padding:26px 32px 24px;">
    <h1 style="margin:0 0 12px;font-family:${f.display};font-weight:800;font-size:26px;line-height:1.1;color:${c.text};">${esc(opts.title)}</h1>
    <div style="font-size:14px;line-height:1.55;">${opts.body}</div>
    ${opts.cta ? `<p style="margin:24px 0 4px;"><a href="${opts.cta.url}" style="display:inline-block;background:${c.text};color:#fff;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:.04em;padding:12px 20px;border-radius:2px;">${esc(opts.cta.label)}</a></p>` : ""}
  </td></tr>
  <tr><td style="padding:14px 32px 20px;border-top:1px solid ${c.border};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
      <td style="font-family:${f.body};font-weight:700;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:${c.muted};line-height:1.7;">${esc(brand.footerLine1)}<br>${esc(footer2)}</td>
      <td align="right" style="font-family:${f.display};font-weight:800;font-size:14px;color:${c.accent};white-space:nowrap;padding-left:12px;">${esc(brand.slogan[opts.lang])}</td>
    </tr></table>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export function table(rows: string[][], opts: { header?: string[]; alignRight?: number[] } = {}) {
  const c = brand.colors;
  const right = new Set(opts.alignRight ?? []);
  const cell = (v: string, i: number, th = false) =>
    `<${th ? "th" : "td"} style="padding:8px 6px;border-bottom:1px solid ${th ? c.text : c.border};text-align:${right.has(i) ? "right" : "left"};font-size:${th ? "8px" : "13px"};${th ? `text-transform:uppercase;letter-spacing:.14em;color:${c.muted};font-weight:700;` : ""}${right.has(i) ? `font-family:${brand.fonts.mono};` : ""}">${v}</${th ? "th" : "td"}>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-collapse:collapse;">
    ${opts.header ? `<tr>${opts.header.map((h, i) => cell(esc(h), i, true)).join("")}</tr>` : ""}
    ${rows.map((r) => `<tr>${r.map((v, i) => cell(v, i)).join("")}</tr>`).join("")}
  </table>`;
}

export function box(html: string, tone: "info" | "warn" = "info") {
  const c = brand.colors;
  return `<div style="margin:16px 0;padding:12px 14px;border-radius:2px;background:${c.cream};border:1px solid ${c.border};border-left:5px solid ${tone === "warn" ? c.accentSoft : c.accent};font-size:13px;line-height:1.5;">${html}</div>`;
}

export const mono = (s: unknown) => `<span style="font-family:${brand.fonts.mono};">${esc(s)}</span>`;
