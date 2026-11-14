import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireActiveCustomer } from "../lib/auth.js";
import { pickTier, resolvePriceListId } from "../lib/pricing.js";
import { stockForVariants } from "../lib/stock.js";

/** Catalogus met klantprijzen (excl. btw) en eigen B2B-voorraad. Alleen voor ingelogde, actieve dealers. */
export async function catalogRoutes(app: FastifyInstance) {
  app.get("/catalog/products", { preHandler: requireActiveCustomer }, async (req) => {
    const q = z.object({ search: z.string().optional(), animal: z.string().optional() }).parse(req.query);
    const priceListId = await resolvePriceListId(req.user.companyId);

    const products = await prisma.product.findMany({
      where: {
        b2bActive: true,
        ...(q.animal ? { animal: q.animal } : {}),
        ...(q.search
          ? { OR: [{ title: { contains: q.search, mode: "insensitive" } }, { variants: { some: { sku: { contains: q.search, mode: "insensitive" } } } }] }
          : {}),
      },
      orderBy: [{ animal: "asc" }, { title: "asc" }],
      include: {
        variants: { where: { b2bActive: true }, orderBy: [{ unitType: "asc" }, { title: "asc" }], include: { prices: priceListId ? { where: { priceListId }, orderBy: { minQty: "asc" } } : false } },
      },
    });
    const variantIds = products.flatMap((p) => p.variants.map((v) => v.id));
    const stock = await stockForVariants(variantIds);
    // Analyse van de partij die als eerste geleverd wordt (kortste THT)
    const firstBatches = await prisma.batch.findMany({ where: { variantId: { in: variantIds }, qtyRemaining: { gt: 0 } }, orderBy: [{ bestBefore: "asc" }], select: { variantId: true, analysis: true, batchNumber: true, bestBefore: true } });
    const firstBatch = new Map<string, { analysis: string | null; batchNumber: string; bestBefore: Date }>();
    for (const b of firstBatches) if (!firstBatch.has(b.variantId)) firstBatch.set(b.variantId, b);

    return products.map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      animal: p.animal,
      tags: p.tags,
      imageUrl: p.imageUrl,
      variants: p.variants.map((v) => {
        const prices = (v as any).prices as { minQty: number; price: any }[] | undefined;
        const base = prices ? pickTier(prices, 1) : null;
        return {
          id: v.id,
          sku: v.sku,
          title: v.title,
          unitType: v.unitType,
          packContent: v.packContent,
          ean: v.ean,
          caseSize: v.caseSize,
          orderInCase: v.orderInCase,
          stock: stock.get(v.id) ?? 0,
          analysis: firstBatch.get(v.id)?.analysis ?? null,
          nextBatch: firstBatch.get(v.id) ? { batchNumber: firstBatch.get(v.id)!.batchNumber, bestBefore: firstBatch.get(v.id)!.bestBefore } : null,
          retailPrice: v.retailPrice == null ? null : Number(v.retailPrice),
          vatRate: Number(v.vatRate),
          price: base?.price ?? null,
          tiers: (prices ?? []).map((t) => ({ minQty: t.minQty, price: Number(t.price) })),
        };
      }),
    }));
  });

  app.get("/catalog/animals", { preHandler: requireActiveCustomer }, async () => {
    const rows = await prisma.product.groupBy({ by: ["animal"], where: { b2bActive: true, animal: { not: null } }, _count: true, orderBy: { animal: "asc" } });
    return rows.map((r) => ({ animal: r.animal, count: r._count }));
  });

  // Snelbestellen: zoek op SKU's
  app.post("/catalog/lookup", { preHandler: requireActiveCustomer }, async (req) => {
    const body = z.object({ skus: z.array(z.string()).min(1).max(100) }).parse(req.body);
    const priceListId = await resolvePriceListId(req.user.companyId);
    const variants = await prisma.productVariant.findMany({
      where: { sku: { in: body.skus.map((s) => s.toUpperCase()) }, b2bActive: true, product: { b2bActive: true } },
      include: { product: true, prices: priceListId ? { where: { priceListId } } : false },
    });
    const stock = await stockForVariants(variants.map((v) => v.id));
    return variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: `${v.product.title} · ${v.title}`,
      caseSize: v.caseSize,
      stock: stock.get(v.id) ?? 0,
      price: pickTier(((v as any).prices ?? []) as any, 1)?.price ?? null,
    }));
  });
}
