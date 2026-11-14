import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireActiveCustomer } from "../lib/auth.js";
import { getSettingNumber, pickTier, resolvePriceListId, round2 } from "../lib/pricing.js";
import { determineVatScheme, VAT_SCHEME_LABEL } from "../lib/vat.js";
import { allocateFefo, stockForVariants } from "../lib/stock.js";
import { sendMail } from "../lib/mail.js";
import { loadOrder, newOrderInternal, orderConfirmation } from "../emails/templates.js";
import { factuurHtml } from "../lib/documents.js";

const orderInput = z.object({
  reference: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
  lines: z.array(z.object({ variantId: z.string(), qty: z.number().int().positive() })).min(1),
});

/** Bepaalt of deze order vooruitbetaald moet worden: de eerste N (prepaidOrders) betaalde orders tellen. */
async function determinePaymentTerms(company: { id: string; prepaidOrders: number }) {
  const paidOrders = await prisma.order.count({ where: { companyId: company.id, paymentStatus: "PAID", status: { not: "CANCELLED" } } });
  return paidOrders >= company.prepaidOrders ? ("ON_ACCOUNT" as const) : ("PREPAID" as const);
}

/** Berekent een order (prijzen, btw-regime, verzendkosten, betaaltermijn) zonder op te slaan. */
async function quote(companyId: string, input: z.infer<typeof orderInput>) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  const priceListId = await resolvePriceListId(companyId);
  const vatScheme = determineVatScheme(company.shipCountry, company.vatValidated);
  const chargeVat = vatScheme === "NL_VAT";

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    include: { product: true, prices: priceListId ? { where: { priceListId } } : false },
  });
  const stock = await stockForVariants(variants.map((v) => v.id));
  const errors: string[] = [];
  const lines = input.lines.map((l) => {
    const v = variants.find((x) => x.id === l.variantId);
    if (!v) {
      errors.push(`Onbekend artikel: ${l.variantId}`);
      return null;
    }
    const label = `${v.product.title} · ${v.title}`;
    if (v.orderInCase && l.qty % v.caseSize !== 0) errors.push(`${v.sku}: alleen per omdoos van ${v.caseSize} bestelbaar`);
    const available = stock.get(v.id) ?? 0;
    if (l.qty > available) errors.push(`${label}: slechts ${available} op voorraad`);
    const tier = pickTier(((v as any).prices ?? []) as any, l.qty);
    if (!tier) {
      errors.push(`${v.sku}: geen prijs beschikbaar`);
      return null;
    }
    const lineTotal = round2(tier.price * l.qty);
    const vatRate = chargeVat ? Number(v.vatRate) : 0;
    return {
      variantId: v.id,
      sku: v.sku,
      title: label,
      qty: l.qty,
      unitPriceExVat: tier.price,
      vatRate,
      lineTotalExVat: lineTotal,
      vat: round2(lineTotal * (vatRate / 100)),
    };
  });
  const valid = lines.filter((l): l is NonNullable<typeof l> => l !== null);
  const subtotalExVat = round2(valid.reduce((s, l) => s + l.lineTotalExVat, 0));
  const minOrder = await getSettingNumber("minOrderExVat", 0);
  const freeFrom = await getSettingNumber("freeShippingExVat", Infinity);
  const shippingRate = await getSettingNumber("shippingExVat", 0);
  const shippingExVat = subtotalExVat >= freeFrom ? 0 : shippingRate;
  const vatTotal = round2(valid.reduce((s, l) => s + l.vat, 0) + (chargeVat ? shippingExVat * 0.21 : 0));
  if (subtotalExVat < minOrder) errors.push(`Minimale orderwaarde is € ${minOrder.toFixed(2)} excl. btw`);
  const paymentTerms = await determinePaymentTerms(company);
  return {
    lines: valid,
    subtotalExVat,
    shippingExVat,
    vatTotal,
    totalIncVat: round2(subtotalExVat + shippingExVat + vatTotal),
    vatScheme,
    vatSchemeLabel: VAT_SCHEME_LABEL[vatScheme],
    paymentTerms,
    paymentTermDays: company.paymentTermDays,
    minOrderExVat: minOrder,
    freeShippingExVat: freeFrom,
    errors,
    company,
  };
}

const orderInclude = { lines: { include: { batches: { include: { batch: { select: { batchNumber: true, bestBefore: true } } } } } } } as const;

export async function orderRoutes(app: FastifyInstance) {
  app.post("/orders/quote", { preHandler: requireActiveCustomer }, async (req) => {
    const { company: _c, ...q } = await quote(req.user.companyId!, orderInput.parse(req.body));
    return q;
  });

  app.post("/orders", { preHandler: requireActiveCustomer }, async (req, reply) => {
    const input = orderInput.parse(req.body);
    const q = await quote(req.user.companyId!, input);
    if (q.errors.length) return reply.code(400).send({ errors: q.errors });
    const company = q.company;
    const dueDate = q.paymentTerms === "ON_ACCOUNT" ? new Date(Date.now() + company.paymentTermDays * 86400000) : null;

    try {
      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            companyId: company.id,
            placedById: req.user.sub,
            reference: input.reference,
            note: input.note,
            vatScheme: q.vatScheme,
            paymentTerms: q.paymentTerms,
            dueDate,
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
        // Automatisch batches + THT koppelen (FEFO) en voorraad afboeken.
        for (const line of created.lines) await allocateFefo(tx, line.id, line.variantId, line.qty);
        return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
      });
      // Orderbevestiging (met betaalinstructies bij vooruitbetaling) + interne melding. Fouten blokkeren de order niet.
      loadOrder(order.id)
        .then(async (full) => { await sendMail(await orderConfirmation(full)); await sendMail(await newOrderInternal(full)); })
        .catch((e) => app.log.error({ err: e }, "orderbevestiging mislukt"));
      return reply.code(201).send(order);
    } catch (e: any) {
      return reply.code(409).send({ errors: [e.message ?? "Order kon niet worden geplaatst"] });
    }
  });

  // Orderhistorie; ?batch=… vindt de orders waarin een partij zat (traceerbaarheid, recall).
  app.get("/orders", { preHandler: requireActiveCustomer }, async (req) => {
    const q = z.object({ batch: z.string().optional() }).parse(req.query);
    return prisma.order.findMany({
      where: { companyId: req.user.companyId!, ...(q.batch ? { lines: { some: { batches: { some: { batch: { batchNumber: { contains: q.batch, mode: "insensitive" } } } } } } } : {}) },
      orderBy: { createdAt: "desc" },
      include: orderInclude,
    });
  });

  app.get("/orders/:id", { preHandler: requireActiveCustomer }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const order = await prisma.order.findFirst({ where: { id, companyId: req.user.companyId! }, include: orderInclude });
    if (!order) return reply.code(404).send({ error: "Order niet gevonden" });
    return order;
  });

  // Factuur voor de dealer zelf (pas beschikbaar als er een factuurnummer is, d.w.z. na verzending).
  app.get("/orders/:id/factuur", { preHandler: requireActiveCustomer }, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const order = await prisma.order.findFirst({ where: { id, companyId: req.user.companyId! } });
    if (!order) return reply.code(404).send({ error: "Order niet gevonden" });
    if (!order.invoiceNumber) return reply.code(409).send({ error: "De factuur volgt bij verzending" });
    reply.type("text/html; charset=utf-8");
    return factuurHtml(await loadOrder(id));
  });
}
