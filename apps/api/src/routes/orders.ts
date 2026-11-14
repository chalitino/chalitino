import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireActiveCustomer } from "../lib/auth.js";
import { getSettingNumber, pickTier, resolvePriceListId, round2 } from "../lib/pricing.js";

const orderInput = z.object({
  reference: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
  lines: z.array(z.object({ variantId: z.string(), qty: z.number().int().positive() })).min(1),
});

/** Berekent een order (prijzen, btw, verzendkosten) zonder op te slaan. */
async function quote(companyId: string, input: z.infer<typeof orderInput>) {
  const priceListId = await resolvePriceListId(companyId);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    include: { product: true, prices: priceListId ? { where: { priceListId } } : false },
  });
  const errors: string[] = [];
  const lines = input.lines.map((l) => {
    const v = variants.find((x) => x.id === l.variantId);
    if (!v) {
      errors.push(`Onbekend artikel: ${l.variantId}`);
      return null;
    }
    if (v.orderInCase && l.qty % v.caseSize !== 0) errors.push(`${v.sku}: alleen per omdoos van ${v.caseSize} bestelbaar`);
    const tier = pickTier(((v as any).prices ?? []) as any, l.qty);
    if (!tier) {
      errors.push(`${v.sku}: geen prijs beschikbaar`);
      return null;
    }
    const lineTotal = round2(tier.price * l.qty);
    return {
      variantId: v.id,
      sku: v.sku,
      title: v.product.title,
      qty: l.qty,
      unitPriceExVat: tier.price,
      vatRate: Number(v.vatRate),
      lineTotalExVat: lineTotal,
      vat: round2(lineTotal * (Number(v.vatRate) / 100)),
    };
  });
  const valid = lines.filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotalExVat = round2(valid.reduce((s, l) => s + l.lineTotalExVat, 0));
  const minOrder = await getSettingNumber("minOrderExVat", 0);
  const freeFrom = await getSettingNumber("freeShippingExVat", Infinity);
  const shippingRate = await getSettingNumber("shippingExVat", 0);
  const shippingExVat = subtotalExVat >= freeFrom ? 0 : shippingRate;
  const vatTotal = round2(valid.reduce((s, l) => s + l.vat, 0) + shippingExVat * 0.21);
  if (subtotalExVat < minOrder) errors.push(`Minimale orderwaarde is € ${minOrder.toFixed(2)} excl. btw`);
  return { lines: valid, subtotalExVat, shippingExVat, vatTotal, totalIncVat: round2(subtotalExVat + shippingExVat + vatTotal), minOrderExVat: minOrder, freeShippingExVat: freeFrom, errors };
}

export async function orderRoutes(app: FastifyInstance) {
  app.post("/orders/quote", { preHandler: requireActiveCustomer }, async (req) => {
    return quote(req.user.companyId!, orderInput.parse(req.body));
  });

  app.post("/orders", { preHandler: requireActiveCustomer }, async (req, reply) => {
    const input = orderInput.parse(req.body);
    const q = await quote(req.user.companyId!, input);
    if (q.errors.length) return reply.code(400).send({ errors: q.errors });
    const company = await prisma.company.findUniqueOrThrow({ where: { id: req.user.companyId! } });

    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        placedById: req.user.sub,
        reference: input.reference,
        note: input.note,
        subtotalExVat: q.subtotalExVat,
        shippingExVat: q.shippingExVat,
        vatTotal: q.vatTotal,
        totalIncVat: q.totalIncVat,
        shipStreet: company.shipStreet,
        shipPostcode: company.shipPostcode,
        shipCity: company.shipCity,
        shipCountry: company.shipCountry,
        lines: {
          create: q.lines.map((l) => ({ variantId: l.variantId, sku: l.sku, title: l.title, qty: l.qty, unitPriceExVat: l.unitPriceExVat, vatRate: l.vatRate, lineTotalExVat: l.lineTotalExVat })),
        },
      },
      include: { lines: true },
    });
    // TODO fase 1b: orderbevestiging mailen (Resend/Postmark) en voorraad reserveren.
    return reply.code(201).send(order);
  });

  app.get("/orders", { preHandler: requireActiveCustomer }, async (req) => {
    return prisma.order.findMany({ where: { companyId: req.user.companyId! }, orderBy: { createdAt: "desc" }, include: { lines: true } });
  });

  app.get("/orders/:id", { preHandler: requireActiveCustomer }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const order = await prisma.order.findFirst({ where: { id, companyId: req.user.companyId! }, include: { lines: true } });
    if (!order) return reply.code(404).send({ error: "Order niet gevonden" });
    return order;
  });
}
