import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

type Tx = Prisma.TransactionClient;

/** Beschikbare voorraad per variant = som van qtyRemaining over batches. */
export async function stockForVariants(variantIds: string[]): Promise<Map<string, number>> {
  const rows = await prisma.batch.groupBy({ by: ["variantId"], where: { variantId: { in: variantIds }, qtyRemaining: { gt: 0 } }, _sum: { qtyRemaining: true } });
  const m = new Map<string, number>();
  for (const id of variantIds) m.set(id, 0);
  for (const r of rows) m.set(r.variantId, r._sum.qtyRemaining ?? 0);
  return m;
}

/**
 * Wijst batches toe aan een orderregel volgens FEFO (First Expired, First Out):
 * de batch met de kortste THT wordt als eerste gebruikt. Gooit een fout bij onvoldoende voorraad.
 */
export async function allocateFefo(tx: Tx, orderLineId: string, variantId: string, qty: number) {
  const batches = await tx.batch.findMany({ where: { variantId, qtyRemaining: { gt: 0 } }, orderBy: [{ bestBefore: "asc" }, { receivedAt: "asc" }] });
  let left = qty;
  const allocations: { batchId: string; batchNumber: string; bestBefore: Date; qty: number }[] = [];
  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(left, b.qtyRemaining);
    await tx.batch.update({ where: { id: b.id }, data: { qtyRemaining: { decrement: take } } });
    await tx.orderLineBatch.create({ data: { orderLineId, batchId: b.id, qty: take } });
    allocations.push({ batchId: b.id, batchNumber: b.batchNumber, bestBefore: b.bestBefore, qty: take });
    left -= take;
  }
  if (left > 0) throw new Error(`Onvoldoende voorraad voor variant ${variantId} (tekort ${left})`);
  return allocations;
}

/** Geeft toegewezen batches terug aan de voorraad (bij annulering). */
export async function releaseAllocations(tx: Tx, orderId: string) {
  const allocs = await tx.orderLineBatch.findMany({ where: { orderLine: { orderId } } });
  for (const a of allocs) {
    await tx.batch.update({ where: { id: a.batchId }, data: { qtyRemaining: { increment: a.qty } } });
  }
  await tx.orderLineBatch.deleteMany({ where: { orderLine: { orderId } } });
}
