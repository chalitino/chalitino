# WicoTreats B2B-webshop

Standalone bestelportaal (website + API) voor wederverkopers van WicoTreats / BRUUN hondensnacks.
Plan van aanpak, scope en architectuur: [docs/PLAN.md](docs/PLAN.md).

```
apps/api   Fastify + Prisma + PostgreSQL  → REST-API (login, catalogus met klantprijzen, orders, beheer)
apps/web   Next.js + Tailwind             → dealerportaal (inloggen, assortiment, snelbestellen, winkelwagen, orders)
docs/      plan, screenshots
```

## Lokaal draaien

Vereist: Node 22, pnpm, en PostgreSQL (via Docker of lokaal).

```bash
pnpm install
pnpm db:up                                   # start Postgres via Docker (of gebruik een eigen database)
cp apps/api/.env.example apps/api/.env       # DATABASE_URL, JWT_SECRET aanpassen
cp apps/web/.env.local.example apps/web/.env.local
pnpm db:migrate                              # maakt tabellen aan
pnpm db:seed                                 # testdata: prijslijsten, demo-dealer, 7 producten
pnpm dev                                     # API op :4000, web op :3000
```

Testlogins na de seed:

| Rol | E-mail | Wachtwoord |
|---|---|---|
| Dealer | dealer@snuffelhoek.example | dealer1234 |
| Beheer | admin@wicotreats.com | admin1234 |

## Producten uit Shopify halen

Maak in Shopify-admin een *custom app* aan met de scopes `read_products` en `read_inventory`,
zet `SHOPIFY_STORE_DOMAIN` en `SHOPIFY_ADMIN_TOKEN` in `apps/api/.env` en draai:

```bash
pnpm --filter @wicotreats/api shopify:sync
```

Alle actieve producten, SKU's, adviesprijzen, EAN's en voorraad komen dan in de B2B-database.
B2B-prijzen koppel je daarna per prijslijst via de admin-API (`PUT /admin/price-lists/:id/items`).

## API in het kort

| Methode & pad | Wie | Doel |
|---|---|---|
| `POST /auth/login`, `/auth/logout`, `GET /auth/me` | iedereen | sessie (JWT in httpOnly-cookie) |
| `POST /auth/register` | iedereen | dealeraanvraag (bedrijf komt op `PENDING`) |
| `GET /catalog/products?animal=&search=` | dealer | assortiment met klantprijs en staffels |
| `POST /catalog/lookup` | dealer | SKU's opzoeken voor snelbestellen |
| `POST /orders/quote`, `POST /orders`, `GET /orders` | dealer | prijsberekening, order plaatsen, historie |
| `GET/PATCH /admin/companies` | beheer | dealers goedkeuren, prijslijst koppelen |
| `GET/POST/PUT /admin/price-lists` | beheer | prijslijsten en prijzen beheren |
| `GET/PATCH /admin/orders` | beheer | orders en status |

## Screenshots

![Assortiment](docs/screenshots/01-assortiment.png)
![Winkelwagen](docs/screenshots/03-winkelwagen.png)
