-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "analysis" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'nl';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoicedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceNumber_key" ON "Order"("invoiceNumber");

