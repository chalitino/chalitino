// Huisstijl WicoTreats, overgenomen uit de Order Printer Pro-sjablonen (pakbon/factuur wicotreats.com).
export const brand = {
  companyName: "WicoTreats",
  legalName: "Wico Diervoeding V.O.F.",
  portalName: "WicoTreats B2B",
  logoUrl: process.env.BRAND_LOGO_URL ?? "",
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
  colors: {
    text: "#4A3933", // warm bruin
    muted: "#7A6A60",
    border: "#E3D6C2",
    cream: "#FBF6EE",
    surface: "#ffffff",
    accent: "#9A5B2E", // roest
    accentSoft: "#EAC88E",
    red: "#B8321C",
    strip: ["#8b3a2a", "#4a3933", "#7a6a3e", "#b86f4a", "#c9a24a", "#3e6a8a", "#9a8a7a", "#5a4a3a", "#b08a5a", "#6a7a5a"],
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
