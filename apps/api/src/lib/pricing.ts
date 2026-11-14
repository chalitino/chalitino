import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export type UnitPrice = { price: number; minQty: number } | null;

/**
 * Bepaalt de klantprijs (excl. btw) voor een variant op basis van de prijslijst van het bedrijf.
 * Staffels: de regel met de hoogste minQty die <= qty is, wint.
 * Geen prijslijst → standaardprijslijst. Geen prijs → null (niet bestelbaar).
 */
export async function resolvePriceListId(companyId: string | null): Promise<string | null> {
  if (companyId) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { priceListId: true } });
    if (company?.priceListId) return company.priceListId;
  }
  const def = await prisma.priceList.findFirst({ where: { isDefault: true }, select: { id: true } });
  return def?.id ?? null;
}

export function pickTier(items: { minQty: number; price: Prisma.Decimal }[], qty: number): UnitPrice {
  const eligible = items.filter((i) => i.minQty <= Math.max(qty, 1)).sort((a, b) => b.minQty - a.minQty);
  if (eligible.length === 0) return null;
  return { price: Number(eligible[0].price), minQty: eligible[0].minQty };
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function getSettingNumber(key: string, fallback: number) {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s ? Number(s.value) : fallback;
}
