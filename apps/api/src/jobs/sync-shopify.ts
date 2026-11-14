// Haalt producten + varianten uit Shopify (GEEN voorraad: B2B heeft eigen voorraad via batches) (Admin GraphQL API) en zet ze in onze database.
// Draai: pnpm --filter @wicotreats/api shopify:sync
// Vereist SHOPIFY_STORE_DOMAIN en SHOPIFY_ADMIN_TOKEN (custom app met read_products, read_inventory).
import "dotenv/config";
import { prisma } from "../lib/prisma.js";

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_ADMIN_TOKEN;
if (!domain || !token) {
  console.error("Zet SHOPIFY_STORE_DOMAIN en SHOPIFY_ADMIN_TOKEN in apps/api/.env");
  process.exit(1);
}

const QUERY = `
query Products($after: String) {
  products(first: 50, after: $after, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    nodes {
      id handle title descriptionHtml productType tags
      featuredMedia { preview { image { url } } }
      variants(first: 20) {
        nodes { id sku title price barcode inventoryItem { measurement { weight { value unit } } } }
      }
    }
  }
}`;

// "Runderkophuid 250 g" → "250 g"; "Lamspootjes 3 stuks" → "3 st"
function packContent(variantTitle: string, productTitle: string): string | null {
  const src = variantTitle === "Default Title" ? productTitle : variantTitle;
  const m = src.match(/(\d+)\s*(g|gram|kg|stuks|st)\b/i);
  if (!m) return null;
  const unit = m[2].toLowerCase().startsWith("st") ? "st" : m[2].toLowerCase() === "gram" ? "g" : m[2].toLowerCase();
  return `${m[1]} ${unit}`;
}
function packTitle(variantTitle: string, productTitle: string) {
  return packContent(variantTitle, productTitle) ?? (variantTitle === "Default Title" ? "Verpakking" : variantTitle);
}

const ANIMALS = ["Rund", "Kip", "Lam", "Eend", "Hert", "Varken", "Vis", "Kalkoen", "Konijn", "Paard", "Geit"];

async function run() {
  let after: string | null = null;
  let count = 0;
  do {
    const res = await fetch(`https://${domain}/admin/api/2025-10/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token! },
      body: JSON.stringify({ query: QUERY, variables: { after } }),
    });
    const json: any = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    const page = json.data.products;
    for (const p of page.nodes) {
      const animal = (p.tags as string[]).find((t) => ANIMALS.includes(t)) ?? null;
      const product = await prisma.product.upsert({
        where: { handle: p.handle },
        update: { shopifyId: p.id, title: p.title, description: p.descriptionHtml, productType: p.productType, tags: p.tags, animal, imageUrl: p.featuredMedia?.preview?.image?.url ?? null },
        create: { shopifyId: p.id, handle: p.handle, title: p.title, description: p.descriptionHtml, productType: p.productType, tags: p.tags, animal, imageUrl: p.featuredMedia?.preview?.image?.url ?? null },
      });
      for (const v of p.variants.nodes) {
        if (!v.sku) continue;
        const w = v.inventoryItem?.measurement?.weight;
        const grams = w ? Math.round(w.unit === "KILOGRAMS" ? w.value * 1000 : w.value) : null;
        await prisma.productVariant.upsert({
          where: { sku: v.sku },
          update: { shopifyId: v.id, productId: product.id, retailPrice: v.price, ean: v.barcode || undefined, weightGrams: grams },
          create: { shopifyId: v.id, productId: product.id, sku: v.sku, title: packTitle(v.title, p.title), unitType: "PACK", packContent: packContent(v.title, p.title), retailPrice: v.price, ean: v.barcode || null, weightGrams: grams },
        });
      }
      count++;
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  console.log(`Shopify-sync klaar: ${count} producten bijgewerkt.`);
}

run().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
