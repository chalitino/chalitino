import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireStaff } from "../lib/auth.js";
import { checkVies } from "../lib/vat.js";
import { releaseAllocations, stockForVariants } from "../lib/stock.js";
import { sendMail } from "../lib/mail.js";
import { accountApproved, loadOrder, orderShipped } from "../emails/templates.js";
import { ensureInvoiceNumber } from "../lib/invoice.js";
import { factuurHtml, pakbonHtml } from "../lib/documents.js";

const orderInclude = {
  company: { select: { id: true, name: true, email: true, phone: true, vatNumber: true, shipCountry: true } },
  lines: { include: { batches: { include: { batch: { select: { id: true, batchNumber: true, bestBefore: true } } } } } },
} as const;

const ORDER_STATUS = z.enum(["RECEIVED", "PROCESSING", "SHIPPED", "INVOICED", "CANCELLED"]);

/** Medewerkers (STAFF + ADMIN): inkomende orders verwerken, voorraad en batches. */
export async function staffRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaff);

  app.get("/admin/dashboard", async () => {
    const [received, processing, awaitingPayment, lowStock] = await Promise.all([
      prisma.order.count({ where: { status: "RECEIVED" } }),
      prisma.order.count({ where: { status: "PROCESSING" } }),
      prisma.order.count({ where: { paymentTerms: "PREPAID", paymentStatus: "UNPAID", status: { not: "CANCELLED" } } }),
      prisma.batch.count({ where: { qtyRemaining: { gt: 0 }, bestBefore: { lt: new Date(Date.now() + 60 * 86400000) } } }),
    ]);
    return { received, processing, awaitingPayment, batchesExpiringSoon: lowStock };
  });

  app.get("/admin/orders", async (req) => {
    const q = z.object({ status: ORDER_STATUS.optional() }).parse(req.query);
    return prisma.order.findMany({ where: q.status ? { status: q.status } : {}, include: orderInclude, orderBy: { createdAt: "desc" } });
  });

  app.get("/admin/orders/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) return reply.code(404).send({ error: "Order niet gevonden" });
    return order;
  });

  // Status, betaling en track & trace bijwerken.
  app.patch("/admin/orders/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({
      status: ORDER_STATUS.optional(),
      paymentStatus: z.enum(["UNPAID", "PAID"]).optional(),
      trackingCode: z.string().nullable().optional(),
      trackingUrl: z.string().url().nullable().optional(),
    }).parse(req.body);
    const order = await prisma.order.findUniqueOrThrow({ where: { id } });

    const data: any = { ...body };
    if (body.paymentStatus === "PAID" && order.paymentStatus !== "PAID") data.paidAt = new Date();
    if (body.paymentStatus === "UNPAID") data.paidAt = null;
    if (body.status === "SHIPPED") {
      const willBePaid = body.paymentStatus === "PAID" || order.paymentStatus === "PAID";
      if (order.paymentTerms === "PREPAID" && !willBePaid) return reply.code(400).send({ error: "Vooruitbetaling nog niet ontvangen; order kan niet verzonden worden" });
      data.shippedAt = order.shippedAt ?? new Date();
    }
    if (body.status === "CANCELLED" && order.status !== "CANCELLED") {
      return prisma.$transaction(async (tx) => {
        await releaseAllocations(tx, id);
        return tx.order.update({ where: { id }, data, include: orderInclude });
      });
    }
    if (body.status === "SHIPPED" && order.status !== "SHIPPED") await ensureInvoiceNumber(id); // factuur bij verzending
    const updated = await prisma.order.update({ where: { id }, data, include: orderInclude });
    if (body.status === "SHIPPED" && order.status !== "SHIPPED") {
      loadOrder(id).then(async (full) => sendMail(await orderShipped(full))).catch((e) => app.log.error({ err: e }, "verzendmail mislukt"));
    }
    return updated;
  });

  // Documenten in huisstijl (printbaar / opslaan als PDF).
  app.get("/admin/orders/:id/pakbon", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    reply.type("text/html; charset=utf-8");
    return pakbonHtml(await loadOrder(id));
  });
  app.get("/admin/orders/:id/factuur", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await ensureInvoiceNumber(id);
    reply.type("text/html; charset=utf-8");
    return factuurHtml(await loadOrder(id));
  });

  // Voorraad per variant (som van batches) + batches met THT.
  app.get("/admin/stock", async () => {
    const variants = await prisma.productVariant.findMany({ include: { product: { select: { title: true, animal: true } }, batches: { where: { qtyRemaining: { gt: 0 } }, orderBy: { bestBefore: "asc" } } }, orderBy: [{ product: { title: "asc" } }, { title: "asc" }] });
    const stock = await stockForVariants(variants.map((v) => v.id));
    return variants.map((v) => ({ id: v.id, sku: v.sku, product: v.product.title, animal: v.product.animal, title: v.title, unitType: v.unitType, packContent: v.packContent, caseSize: v.caseSize, b2bActive: v.b2bActive, stock: stock.get(v.id) ?? 0, batches: v.batches }));
  });

  // Batch inboeken (ontvangst productie/leverancier).
  app.post("/admin/batches", async (req, reply) => {
    const body = z.object({ sku: z.string(), batchNumber: z.string().min(1), bestBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), qty: z.number().int().positive(), analysis: z.string().optional(), note: z.string().optional() }).parse(req.body);
    const variant = await prisma.productVariant.findUnique({ where: { sku: body.sku.toUpperCase() } });
    if (!variant) return reply.code(404).send({ error: `Onbekende SKU ${body.sku}` });
    const existing = await prisma.batch.findUnique({ where: { variantId_batchNumber: { variantId: variant.id, batchNumber: body.batchNumber } } });
    const batch = existing
      ? await prisma.batch.update({ where: { id: existing.id }, data: { qtyReceived: { increment: body.qty }, qtyRemaining: { increment: body.qty }, bestBefore: new Date(body.bestBefore), analysis: body.analysis ?? undefined } })
      : await prisma.batch.create({ data: { variantId: variant.id, batchNumber: body.batchNumber, bestBefore: new Date(body.bestBefore), qtyReceived: body.qty, qtyRemaining: body.qty, analysis: body.analysis, note: body.note } });
    return reply.code(201).send(batch);
  });

  // Voorraadcorrectie op een batch (telling, breuk, afgekeurd).
  app.patch("/admin/batches/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ qtyRemaining: z.number().int().min(0).optional(), bestBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), analysis: z.string().nullable().optional(), note: z.string().nullable().optional() }).parse(req.body);
    return prisma.batch.update({ where: { id }, data: { ...body, bestBefore: body.bestBefore ? new Date(body.bestBefore) : undefined } });
  });

  // Traceerbaarheid: welke orders kregen deze batch?
  app.get("/admin/batches/:id/orders", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return prisma.orderLineBatch.findMany({ where: { batchId: id }, include: { orderLine: { include: { order: { select: { id: true, number: true, createdAt: true, company: { select: { name: true } } } } } } } });
  });
}

/** Alleen beheer: klanten, prijslijsten, producten, instellingen. */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/admin/companies", async (req) => {
    const q = z.object({ status: z.enum(["PENDING", "ACTIVE", "BLOCKED"]).optional() }).parse(req.query);
    return prisma.company.findMany({ where: q.status ? { status: q.status } : {}, include: { priceList: true, users: { select: { id: true, email: true, name: true } }, _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } });
  });

  app.patch("/admin/companies/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({
      status: z.enum(["PENDING", "ACTIVE", "BLOCKED"]).optional(),
      priceListId: z.string().nullable().optional(),
      paymentTermDays: z.number().int().min(0).optional(),
      prepaidOrders: z.number().int().min(0).optional(),
      vatValidated: z.boolean().optional(),
      locale: z.enum(["nl", "en"]).nullable().optional(),
    }).parse(req.body);
    const data: any = { ...body };
    if (body.vatValidated !== undefined) {
      data.vatValidatedAt = body.vatValidated ? new Date() : null;
      data.vatCheckNote = body.vatValidated ? "Handmatig gecontroleerd" : null;
    }
    const before = await prisma.company.findUniqueOrThrow({ where: { id } });
    const company = await prisma.company.update({ where: { id }, data });
    if (body.status === "ACTIVE" && before.status !== "ACTIVE") {
      sendMail(accountApproved(company)).catch((e) => app.log.error({ err: e }, "welkomstmail mislukt"));
    }
    return company;
  });

  // Btw-nummer controleren bij VIES; bij geldig → btw verlegd voor EU-klanten.
  app.post("/admin/companies/:id/check-vat", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const company = await prisma.company.findUniqueOrThrow({ where: { id } });
    if (!company.vatNumber) return reply.code(400).send({ error: "Geen btw-nummer bekend" });
    const result = await checkVies(company.vatNumber);
    if (!result) return reply.code(502).send({ error: "VIES is niet bereikbaar; probeer later of keur handmatig goed" });
    const note = result.valid ? `VIES geldig${result.name ? `: ${result.name}` : ""}` : "VIES: ongeldig nummer";
    const updated = await prisma.company.update({ where: { id }, data: { vatValidated: result.valid, vatValidatedAt: new Date(), vatCheckNote: note } });
    return { valid: result.valid, name: result.name, address: result.address, company: updated };
  });

  app.get("/admin/price-lists", async () => prisma.priceList.findMany({ include: { _count: { select: { items: true, companies: true } } } }));

  app.post("/admin/price-lists", async (req, reply) => {
    const body = z.object({ name: z.string().min(2), isDefault: z.boolean().optional() }).parse(req.body);
    return reply.code(201).send(await prisma.priceList.create({ data: body }));
  });

  app.get("/admin/price-lists/:id/items", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    return prisma.priceListItem.findMany({ where: { priceListId: id }, include: { variant: { select: { sku: true, title: true, product: { select: { title: true } } } } }, orderBy: [{ variant: { sku: "asc" } }, { minQty: "asc" }] });
  });

  // Prijzen in bulk zetten: [{ sku, minQty?, price }]
  app.put("/admin/price-lists/:id/items", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ items: z.array(z.object({ sku: z.string(), minQty: z.number().int().positive().default(1), price: z.number().nonnegative() })) }).parse(req.body);
    let updated = 0;
    const missing: string[] = [];
    for (const it of body.items) {
      const v = await prisma.productVariant.findUnique({ where: { sku: it.sku.toUpperCase() } });
      if (!v) {
        missing.push(it.sku);
        continue;
      }
      await prisma.priceListItem.upsert({
        where: { priceListId_variantId_minQty: { priceListId: id, variantId: v.id, minQty: it.minQty } },
        update: { price: it.price },
        create: { priceListId: id, variantId: v.id, minQty: it.minQty, price: it.price },
      });
      updated++;
    }
    return { updated, missing };
  });

  app.get("/admin/products", async () => prisma.product.findMany({ include: { variants: true }, orderBy: { title: "asc" } }));

  // B2B-eenheid toevoegen aan een product (bulk 1 kg, verpakking 100 g, 5 st, ...)
  app.post("/admin/products/:id/variants", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ sku: z.string().min(3), title: z.string().min(1), unitType: z.enum(["PACK", "BULK"]), packContent: z.string().optional(), caseSize: z.number().int().positive().default(1), orderInCase: z.boolean().default(false), ean: z.string().optional(), weightGrams: z.number().int().optional() }).parse(req.body);
    return reply.code(201).send(await prisma.productVariant.create({ data: { ...body, sku: body.sku.toUpperCase(), productId: id } }));
  });

  app.patch("/admin/variants/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ title: z.string().optional(), unitType: z.enum(["PACK", "BULK"]).optional(), packContent: z.string().nullable().optional(), caseSize: z.number().int().positive().optional(), orderInCase: z.boolean().optional(), ean: z.string().nullable().optional(), b2bActive: z.boolean().optional() }).parse(req.body);
    return prisma.productVariant.update({ where: { id }, data: body });
  });

  app.get("/admin/settings", async () => prisma.setting.findMany());
  app.put("/admin/settings", async (req) => {
    const body = z.record(z.string()).parse(req.body);
    for (const [key, value] of Object.entries(body)) await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    return prisma.setting.findMany();
  });

  // Medewerker-accounts aanmaken (STAFF of ADMIN)
  app.post("/admin/users", async (req, reply) => {
    const bcrypt = (await import("bcryptjs")).default;
    const body = z.object({ email: z.string().email(), name: z.string().min(2), password: z.string().min(8), role: z.enum(["ADMIN", "STAFF"]) }).parse(req.body);
    const user = await prisma.user.create({ data: { email: body.email.toLowerCase(), name: body.name, role: body.role, passwordHash: await bcrypt.hash(body.password, 10) } });
    return reply.code(201).send({ id: user.id, email: user.email, role: user.role });
  });
}
