import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../lib/auth.js";

/** Beheer-endpoints voor WicoTreats: klanten goedkeuren, prijslijsten, orders. */
export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAdmin);

  app.get("/admin/companies", async (req) => {
    const q = z.object({ status: z.enum(["PENDING", "ACTIVE", "BLOCKED"]).optional() }).parse(req.query);
    return prisma.company.findMany({ where: q.status ? { status: q.status } : {}, include: { priceList: true, users: { select: { id: true, email: true, name: true } } }, orderBy: { createdAt: "desc" } });
  });

  app.patch("/admin/companies/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ status: z.enum(["PENDING", "ACTIVE", "BLOCKED"]).optional(), priceListId: z.string().nullable().optional(), paymentTermDays: z.number().int().optional() }).parse(req.body);
    return prisma.company.update({ where: { id }, data: body });
  });

  app.get("/admin/price-lists", async () => prisma.priceList.findMany({ include: { _count: { select: { items: true, companies: true } } } }));

  app.post("/admin/price-lists", async (req, reply) => {
    const body = z.object({ name: z.string().min(2), isDefault: z.boolean().optional() }).parse(req.body);
    return reply.code(201).send(await prisma.priceList.create({ data: body }));
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

  app.get("/admin/orders", async (req) => {
    const q = z.object({ status: z.enum(["RECEIVED", "PROCESSING", "SHIPPED", "INVOICED", "CANCELLED"]).optional() }).parse(req.query);
    return prisma.order.findMany({ where: q.status ? { status: q.status } : {}, include: { company: { select: { name: true } }, lines: true }, orderBy: { createdAt: "desc" } });
  });

  app.patch("/admin/orders/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ status: z.enum(["RECEIVED", "PROCESSING", "SHIPPED", "INVOICED", "CANCELLED"]) }).parse(req.body);
    return prisma.order.update({ where: { id }, data: body });
  });

  app.get("/admin/products", async () => prisma.product.findMany({ include: { variants: true }, orderBy: { title: "asc" } }));

  app.patch("/admin/variants/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({ caseSize: z.number().int().positive().optional(), orderInCase: z.boolean().optional(), ean: z.string().nullable().optional(), stock: z.number().int().optional() }).parse(req.body);
    return prisma.productVariant.update({ where: { id }, data: body });
  });
}
