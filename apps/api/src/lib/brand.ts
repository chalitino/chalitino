// Huisstijl WicoTreats, overgenomen uit de Order Printer Pro-sjablonen (pakbon/factuur wicotreats.com).
import logo from "./logo-paths.json" with { type: "json" };

/** Liggend logo als inline SVG (voor documenten). */
export const logoSvg = (fill: string, height = 30) =>
  `<svg role="img" aria-label="WicoTreats" width="${Math.round((height * 12500) / 1480)}" height="${height}" viewBox="0 -1300 12500 1480" xmlns="http://www.w3.org/2000/svg"><path fill="${fill}" d="${logo.wico}"/><path fill="${fill}" transform="translate(5420 -60)" d="${logo.treats}"/></svg>`;
export const LOGO_COLORS = logo.colors;

export const brand = {
  companyName: "WicoTreats",
  legalName: "Wico Diervoeding V.O.F.",
  portalName: "WicoTreats B2B",
  // E-mailclients tonen geen SVG: PNG van het liggende logo, gehost door de web-app (of eigen URL via BRAND_LOGO_URL).
  logoUrl: process.env.BRAND_LOGO_URL ?? `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/brand/wicotreats-horizontal-bruun.png`,
  tagline: { nl: "Groothandel in natuurlijke hondensnacks · Swalmen (NL) · sinds 1993", en: "Wholesale natural dog snacks · Swalmen (NL) · since 1993" },
  slogan: { nl: "Met de hand ingepakt in Swalmen.", en: "Hand-packed in Swalmen." },
  sloganInvoice: "We have nothing to hide.",
  address: { street: "Maalbroekweg 1B", postcode: "6071 NS", city: "Swalmen", country: "Nederland" },
  phone: "06 13148616",
  email: "info@wicotreats.com",
  kvk: "13033716",
  vat: "NL806311551B01",
  nvwa: "7346",
  iban: "NL69 INGB 0682 8682 05",
  bic: "INGBNL2A",
  termsUrl: "wicotreats.com/pages/handelsvoorwaarden",
  footerLine1: "Wico Diervoeding V.O.F. · Maalbroekweg 1B · 6071 NS Swalmen · info@wicotreats.com · 06 13148616",
  // BRUUN merkhandboek · 05 Kleur
  colors: {
    text: "#3B2416", // bruun
    ink2: "#2C1A0F", // bruun-diep
    muted: "#7B6554",
    border: "#D2C3AE",
    cream: "#F3E6CF", // crème
    creamDeep: "#EAD9BA", // crème-diep: vlakken
    surface: "#F3E6CF",
    accent: "#B8321C", // rund-inkt: tekst op crème
    accentSoft: "#F0B43A", // kip
    red: "#B8321C",
    // Dierenstrook in handboekvolgorde: rund, kip, kalkoen, eend, lam, geit, hert, zwijn, paard, konijn, kameel, vis, supplementen
    strip: ["#E0452C", "#F0B43A", "#D9824A", "#B5A58A", "#C4956A", "#A8A060", "#9DB88A", "#E8955A", "#A67C6D", "#C98BB0", "#D4B483", "#8FBCE6", "#8FA67A"],
  },
  fonts: {
    display: "Gluten, 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif",
    body: "'Rethink Sans', Helvetica, Arial, sans-serif",
    mono: "'IBM Plex Mono', Menlo, monospace",
    importUrl: "https://fonts.googleapis.com/css2?family=Gluten:wght@800&family=Rethink+Sans:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
  portalUrl: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  supportEmail: process.env.MAIL_REPLY_TO ?? "info@wicotreats.com",
};

export type Lang = "nl" | "en";

/** Taalregel: Nederlands voor NL/BE, Engels voor alle andere landen; Company.locale overschrijft. */
export function langFor(company: { shipCountry: string; locale?: string | null }): Lang {
  if (company.locale === "en" || company.locale === "nl") return company.locale;
  const cc = company.shipCountry.toUpperCase();
  return cc === "NL" || cc === "BE" ? "nl" : "en";
}

export const strip = () => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>${brand.colors.strip.map((c) => `<td style="height:7px;background:${c};font-size:0;line-height:0;">&nbsp;</td>`).join("")}</tr></table>`;
