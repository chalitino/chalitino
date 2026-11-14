import type { VatScheme } from "@prisma/client";

export const EU_COUNTRIES = new Set(["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"]);

/**
 * Btw-regime op basis van afleverland en gevalideerd btw-nummer.
 * NL → Nederlandse btw. EU + geldig btw-nummer → verlegd (0%). EU zonder geldig nummer → NL btw. Buiten EU → export (0%).
 */
export function determineVatScheme(country: string, vatValidated: boolean): VatScheme {
  const c = country.toUpperCase();
  if (c === "NL") return "NL_VAT";
  if (EU_COUNTRIES.has(c)) return vatValidated ? "EU_REVERSE_CHARGE" : "NL_VAT";
  return "EXPORT";
}

export const VAT_SCHEME_LABEL: Record<VatScheme, string> = {
  NL_VAT: "Nederlandse btw",
  EU_REVERSE_CHARGE: "Btw verlegd (intracommunautaire levering)",
  EXPORT: "0% btw (export buiten EU)",
};

/** Controleert een EU-btw-nummer bij VIES (Europese Commissie). Geeft null terug als VIES niet bereikbaar is. */
export async function checkVies(vatNumber: string): Promise<{ valid: boolean; name?: string; address?: string } | null> {
  const clean = vatNumber.replace(/[\s.-]/g, "").toUpperCase();
  const cc = clean.slice(0, 2);
  const num = clean.slice(2);
  if (!EU_COUNTRIES.has(cc) || !num) return { valid: false };
  try {
    const res = await fetch(`https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${cc}/vat/${num}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const j: any = await res.json();
    if (typeof j.isValid !== "boolean") return null;
    return { valid: j.isValid, name: j.name, address: j.address };
  } catch {
    return null;
  }
}
