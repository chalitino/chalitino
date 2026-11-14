import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Kent een opvolgend factuurnummer toe (bv. F2026-0001) als de order er nog geen heeft. */
export async function ensureInvoiceNumber(orderId: string, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.invoiceNumber) return order.invoiceNumber;
  const prefixRow = await tx.setting.findUnique({ where: { key: "invoicePrefix" } });
  const prefix = prefixRow?.value ?? "F";
  const year = new Date().getFullYear();
  const last = await tx.order.findFirst({ where: { invoiceNumber: { startsWith: `${prefix}${year}-` } }, orderBy: { invoiceNumber: "desc" }, select: { invoiceNumber: true } });
  const seq = last?.invoiceNumber ? parseInt(last.invoiceNumber.split("-").pop()!, 10) + 1 : 1;
  const invoiceNumber = `${prefix}${year}-${String(seq).padStart(4, "0")}`;
  await tx.order.update({ where: { id: orderId }, data: { invoiceNumber, invoicedAt: new Date() } });
  return invoiceNumber;
}
