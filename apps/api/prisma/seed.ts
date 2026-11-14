// Vult de database met een admin, twee prijslijsten, een testdealer en een paar producten.
// Draai: pnpm --filter @wicotreats/api prisma:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products = [
  { sku: "BRUUN001", handle: "runderkophuid-250g", title: "Runderkophuid 250 g", animal: "Rund", retail: 6.49, caseSize: 12, tags: ["Huid", "Kauwsnack"] },
  { sku: "BRUUN002", handle: "runderkopvel-met-haar-250g", title: "Runderkopvel met haar 250 g", animal: "Rund", retail: 6.99, caseSize: 12, tags: ["Huid", "Kauwsnack"] },
  { sku: "BRUUN003", handle: "runderslokdarm-plat-200g", title: "Runderslokdarm plat 200 g", animal: "Rund", retail: 6.0, caseSize: 12, tags: ["Organen", "Kauwsnack"] },
  { sku: "BRUUN005", handle: "kippenpootjes-250g", title: "Kippenpootjes 250 g", animal: "Kip", retail: 3.99, caseSize: 12, tags: ["Pootjes", "Tussendoortje"] },
  { sku: "BRUUN009", handle: "eendenpootjes-250g", title: "Eendenpootjes 250 g", animal: "Eend", retail: 4.99, caseSize: 12, tags: ["Pootjes", "Tussendoortje"] },
  { sku: "BRUUN016", handle: "lamspens-200g", title: "Lamspens 200 g", animal: "Lam", retail: 7.99, caseSize: 12, tags: ["Organen", "Kauwsnack"] },
  { sku: "BRUUN027", handle: "hertenstrips-200g", title: "Hertenstrips 200 g", animal: "Hert", retail: 7.49, caseSize: 12, tags: ["Strips", "Tussendoortje"] },
];

async function main() {
  const dealer = await prisma.priceList.upsert({
    where: { name: "Dealer" },
    update: {},
    create: { name: "Dealer", isDefault: true },
  });
  const wholesale = await prisma.priceList.upsert({
    where: { name: "Groothandel" },
    update: {},
    create: { name: "Groothandel" },
  });

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { handle: p.handle },
      update: { title: p.title, animal: p.animal, tags: p.tags },
      create: {
        handle: p.handle,
        title: p.title,
        productType: "Hondensnack",
        animal: p.animal,
        tags: p.tags,
        description: `${p.title} — single ingredient, gedroogd, zonder toevoegingen.`,
      },
    });
    const variant = await prisma.productVariant.upsert({
      where: { sku: p.sku },
      update: { retailPrice: p.retail, caseSize: p.caseSize },
      create: {
        productId: product.id,
        sku: p.sku,
        title: "Standaard",
        caseSize: p.caseSize,
        retailPrice: p.retail,
        stock: 120,
      },
    });
    // Dealerprijs: ~55% van adviesprijs incl. btw, omgerekend naar excl. btw.
    const retailEx = p.retail / 1.09;
    const dealerPrice = round(retailEx * 0.55);
    const wholesalePrice = round(retailEx * 0.45);
    await prisma.priceListItem.upsert({
      where: { priceListId_variantId_minQty: { priceListId: dealer.id, variantId: variant.id, minQty: 1 } },
      update: { price: dealerPrice },
      create: { priceListId: dealer.id, variantId: variant.id, minQty: 1, price: dealerPrice },
    });
    // Staffel: vanaf 5 omdozen 5% extra korting
    await prisma.priceListItem.upsert({
      where: { priceListId_variantId_minQty: { priceListId: dealer.id, variantId: variant.id, minQty: p.caseSize * 5 } },
      update: { price: round(dealerPrice * 0.95) },
      create: { priceListId: dealer.id, variantId: variant.id, minQty: p.caseSize * 5, price: round(dealerPrice * 0.95) },
    });
    await prisma.priceListItem.upsert({
      where: { priceListId_variantId_minQty: { priceListId: wholesale.id, variantId: variant.id, minQty: 1 } },
      update: { price: wholesalePrice },
      create: { priceListId: wholesale.id, variantId: variant.id, minQty: 1, price: wholesalePrice },
    });
  }

  const adminHash = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@wicotreats.com" },
    update: {},
    create: { email: "admin@wicotreats.com", passwordHash: adminHash, name: "WicoTreats beheer", role: "ADMIN" },
  });

  const company = await prisma.company.upsert({
    where: { id: "demo-dealer" },
    update: {},
    create: {
      id: "demo-dealer",
      name: "Dierenspeciaalzaak De Snuffelhoek",
      kvkNumber: "12345678",
      vatNumber: "NL123456789B01",
      email: "inkoop@snuffelhoek.example",
      status: "ACTIVE",
      priceListId: dealer.id,
      invoiceStreet: "Hoofdstraat 1",
      invoicePostcode: "1234 AB",
      invoiceCity: "Utrecht",
      shipStreet: "Hoofdstraat 1",
      shipPostcode: "1234 AB",
      shipCity: "Utrecht",
    },
  });
  const dealerHash = await bcrypt.hash("dealer1234", 10);
  await prisma.user.upsert({
    where: { email: "dealer@snuffelhoek.example" },
    update: {},
    create: { email: "dealer@snuffelhoek.example", passwordHash: dealerHash, name: "Sanne de Vries", role: "CUSTOMER", companyId: company.id },
  });

  await prisma.setting.upsert({ where: { key: "minOrderExVat" }, update: {}, create: { key: "minOrderExVat", value: "100" } });
  await prisma.setting.upsert({ where: { key: "freeShippingExVat" }, update: {}, create: { key: "freeShippingExVat", value: "250" } });
  await prisma.setting.upsert({ where: { key: "shippingExVat" }, update: {}, create: { key: "shippingExVat", value: "7.50" } });

  console.log("Seed klaar. Logins: admin@wicotreats.com / admin1234, dealer@snuffelhoek.example / dealer1234");
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

main().finally(() => prisma.$disconnect());
