import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireActiveCustomer } from "../lib/auth.js";
import { pickTier, resolvePriceListId } from "../lib/pricing.js";

/** Catalogus met klantspecifieke prijzen (excl. btw). Alleen voor ingelogde, actieve dealers. */
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
        variants: { include: { prices: priceListId ? { where: { priceListId }, orderBy: { minQty: "asc" } } : false } },
      },
    });

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
          ean: v.ean,
          caseSize: v.caseSize,
          orderInCase: v.orderInCase,
          stock: v.stock,
          retailPrice: Number(v.retailPrice),
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
      where: { sku: { in: body.skus.map((s) => s.toUpperCase()) }, product: { b2bActive: true } },
      include: { product: true, prices: priceListId ? { where: { priceListId } } : false },
    });
    return variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.product.title,
      caseSize: v.caseSize,
      stock: v.stock,
      price: pickTier(((v as any).prices ?? []) as any, 1)?.price ?? null,
    }));
  });
}
