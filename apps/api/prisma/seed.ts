// Vult de database met beheer/medewerker-accounts, een prijslijst, een testdealer,
// producten met B2B-eenheden (verpakking + bulk) en batches met THT.
// Draai: pnpm --filter @wicotreats/api prisma:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Per product: consumentenverpakking (uit Shopify), kleinverpakking en bulk.
const products = [
  { sku: "BRUUN001", handle: "runderkophuid-250g", title: "Runderkophuid", animal: "Rund", pack: "250 g", retail: 6.49, tags: ["Huid", "Kauwsnack"] },
  { sku: "BRUUN002", handle: "runderkopvel-met-haar-250g", title: "Runderkopvel met haar", animal: "Rund", pack: "250 g", retail: 6.99, tags: ["Huid", "Kauwsnack"] },
  { sku: "BRUUN003", handle: "runderslokdarm-plat-200g", title: "Runderslokdarm plat", animal: "Rund", pack: "200 g", retail: 6.0, tags: ["Organen", "Kauwsnack"] },
  { sku: "BRUUN005", handle: "kippenpootjes-250g", title: "Kippenpootjes", animal: "Kip", pack: "250 g", retail: 3.99, tags: ["Pootjes", "Tussendoortje"] },
  { sku: "BRUUN009", handle: "eendenpootjes-250g", title: "Eendenpootjes", animal: "Eend", pack: "250 g", retail: 4.99, tags: ["Pootjes", "Tussendoortje"] },
  { sku: "BRUUN016", handle: "lamspens-200g", title: "Lamspens", animal: "Lam", pack: "200 g", retail: 7.99, tags: ["Organen", "Kauwsnack"] },
  { sku: "BRUUN018", handle: "lamspootjes-3-stuks", title: "Lamspootjes", animal: "Lam", pack: "3 st", retail: 4.99, tags: ["Pootjes", "Kauwsnack"] },
  { sku: "BRUUN027", handle: "hertenstrips-200g", title: "Hertenstrips", animal: "Hert", pack: "200 g", retail: 7.49, tags: ["Strips", "Tussendoortje"] },
];

const round = (n: number) => Math.round(n * 100) / 100;
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);

async function main() {
  const dealer = await prisma.priceList.upsert({ where: { name: "Dealer" }, update: { isDefault: true }, create: { name: "Dealer", isDefault: true } });

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { handle: p.handle },
      update: { title: p.title, animal: p.animal, tags: p.tags },
      create: { handle: p.handle, title: p.title, productType: "Hondensnack", animal: p.animal, tags: p.tags, description: `${p.title} — single ingredient, gedroogd, zonder toevoegingen.` },
    });
    const retailEx = p.retail / 1.09; // adviesprijs excl. 9% btw
    const grams = parseInt(p.pack) * (p.pack.endsWith("st") ? 0 : 1);
    const perKgDealer = grams ? (retailEx * 0.55) / (grams / 1000) : null;

    const units: { sku: string; title: string; unitType: "PACK" | "BULK"; packContent: string; caseSize: number; retailPrice: number | null; price: number }[] = [
      { sku: p.sku, title: `Verpakking ${p.pack}`, unitType: "PACK", packContent: p.pack, caseSize: 12, retailPrice: p.retail, price: round(retailEx * 0.55) },
    ];
    if (perKgDealer) {
      units.push({ sku: `${p.sku}-100`, title: "Verpakking 100 g", unitType: "PACK", packContent: "100 g", caseSize: 20, retailPrice: null, price: round(perKgDealer * 0.1 * 1.1) });
      units.push({ sku: `${p.sku}-B1`, title: "Bulk 1 kg", unitType: "BULK", packContent: "1 kg", caseSize: 1, retailPrice: null, price: round(perKgDealer * 0.85) });
    } else {
      units.push({ sku: `${p.sku}-B50`, title: "Bulk 50 stuks", unitType: "BULK", packContent: "50 st", caseSize: 1, retailPrice: null, price: round((retailEx * 0.55) / 3 * 50 * 0.85) });
    }

    for (const u of units) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: u.sku },
        update: { title: u.title, unitType: u.unitType, packContent: u.packContent, caseSize: u.caseSize, retailPrice: u.retailPrice },
        create: { productId: product.id, sku: u.sku, title: u.title, unitType: u.unitType, packContent: u.packContent, caseSize: u.caseSize, retailPrice: u.retailPrice },
      });
      await prisma.priceListItem.upsert({
        where: { priceListId_variantId_minQty: { priceListId: dealer.id, variantId: variant.id, minQty: 1 } },
        update: { price: u.price },
        create: { priceListId: dealer.id, variantId: variant.id, minQty: 1, price: u.price },
      });
      // Staffel: vanaf 5 omdozen (of 10 kg bulk) 5% korting
      const tierQty = u.unitType === "BULK" ? 10 : u.caseSize * 5;
      await prisma.priceListItem.upsert({
        where: { priceListId_variantId_minQty: { priceListId: dealer.id, variantId: variant.id, minQty: tierQty } },
        update: { price: round(u.price * 0.95) },
        create: { priceListId: dealer.id, variantId: variant.id, minQty: tierQty, price: round(u.price * 0.95) },
      });
      // Twee batches met verschillende THT, zodat FEFO zichtbaar is
      for (const [i, b] of [{ n: "A", tht: 120, qty: 60 }, { n: "B", tht: 300, qty: 240 }].entries()) {
        const batchNumber = `${u.sku}-2026${String(i + 1).padStart(2, "0")}${b.n}`;
        await prisma.batch.upsert({
          where: { variantId_batchNumber: { variantId: variant.id, batchNumber } },
          update: {},
          create: { variantId: variant.id, batchNumber, bestBefore: daysFromNow(b.tht), qtyReceived: b.qty, qtyRemaining: b.qty },
        });
      }
    }
  }

  const hash = (pw: string) => bcrypt.hash(pw, 10);
  await prisma.user.upsert({ where: { email: "admin@wicotreats.com" }, update: { role: "ADMIN" }, create: { email: "admin@wicotreats.com", passwordHash: await hash("admin1234"), name: "WicoTreats beheer", role: "ADMIN" } });
  await prisma.user.upsert({ where: { email: "magazijn@wicotreats.com" }, update: { role: "STAFF" }, create: { email: "magazijn@wicotreats.com", passwordHash: await hash("staff1234"), name: "Magazijn", role: "STAFF" } });

  // NL-dealer (NL btw, eerste 2 orders vooruit)
  const nl = await prisma.company.upsert({
    where: { id: "demo-dealer" },
    update: {},
    create: {
      id: "demo-dealer", name: "Dierenspeciaalzaak De Snuffelhoek", kvkNumber: "12345678", vatNumber: "NL123456789B01", email: "inkoop@snuffelhoek.example",
      status: "ACTIVE", priceListId: dealer.id,
      invoiceStreet: "Hoofdstraat 1", invoicePostcode: "1234 AB", invoiceCity: "Utrecht", shipStreet: "Hoofdstraat 1", shipPostcode: "1234 AB", shipCity: "Utrecht",
    },
  });
  await prisma.user.upsert({ where: { email: "dealer@snuffelhoek.example" }, update: {}, create: { email: "dealer@snuffelhoek.example", passwordHash: await hash("dealer1234"), name: "Sanne de Vries", role: "CUSTOMER", companyId: nl.id } });

  // Belgische dealer met gevalideerd btw-nummer (btw verlegd), al op rekening
  const be = await prisma.company.upsert({
    where: { id: "demo-dealer-be" },
    update: {},
    create: {
      id: "demo-dealer-be", name: "Hondenwinkel Antwerpen BV", vatNumber: "BE0123456789", email: "bestel@hondenwinkel.example",
      status: "ACTIVE", priceListId: dealer.id, vatValidated: true, vatValidatedAt: new Date(), vatCheckNote: "Seed: gevalideerd", prepaidOrders: 0,
      invoiceStreet: "Meir 10", invoicePostcode: "2000", invoiceCity: "Antwerpen", invoiceCountry: "BE", shipStreet: "Meir 10", shipPostcode: "2000", shipCity: "Antwerpen", shipCountry: "BE",
    },
  });
  await prisma.user.upsert({ where: { email: "dealer@hondenwinkel.example" }, update: {}, create: { email: "dealer@hondenwinkel.example", passwordHash: await hash("dealer1234"), name: "Tom Peeters", role: "CUSTOMER", companyId: be.id } });

  for (const [key, value] of [["minOrderExVat", "100"], ["freeShippingExVat", "250"], ["shippingExVat", "7.50"], ["bankIban", "NL00BANK0123456789"], ["bankName", "WicoTreats"]]) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log("Seed klaar.\n  beheer:     admin@wicotreats.com / admin1234\n  magazijn:   magazijn@wicotreats.com / staff1234\n  dealer NL:  dealer@snuffelhoek.example / dealer1234\n  dealer BE:  dealer@hondenwinkel.example / dealer1234");
}

main().finally(() => prisma.$disconnect());
