# WicoTreats B2B-webshop — Plan van aanpak

> Doel: een eigen B2B-bestelportaal (standalone website + API) voor wederverkopers van
> WicoTreats / BRUUN-snacks, vergelijkbaar met de Dutch Petfood-case van Smarter.nl:
> minder handmatig orderwerk, klantspecifieke prijzen, 24/7 bestellen, koppeling met
> voorraad en administratie.

## 1. Uitgangssituatie

- Consumentenverkoop loopt via Shopify (BRUUN, bruunpets.com): 142 actieve producten,
  SKU-reeks `BRUUN001` t/m `BRUUN0xx`, prijzen in EUR, voorraad per variant.
- B2B-orders (dierenwinkels, trimsalons, groothandel) lopen nu waarschijnlijk via mail,
  WhatsApp of telefoon en worden handmatig verwerkt.
- Er is nog geen eigen software; alleen een Shopify-themasectie in deze repository.

## 1b. Referentie: Dutch Petfood-case (Smarter.nl)

De case beschrijft wat Smarter voor Dutch Petfood bouwde. De punten die daar centraal
staan, en die wij één-op-één overnemen als eisen:

- **Gebruiksgemak voor zakelijke klanten**: duidelijke productstructuur, direct inzicht in
  voorraad en (klantspecifieke) prijzen, een bestelproces dat aansluit bij de zakelijke
  praktijk (herbestellen, bestellen per omdoos, op rekening).
- **Doelgroepen**: groothandel, retail en distributie plaatsen en beheren zelf hun orders.
- **Koppeling met het voorraadsysteem en het financiële pakket**, zodat orders zonder
  handmatig overtypen doorlopen.
- **Volledig afgestemd op de merkidentiteit**: professionele uitstraling, heldere
  call-to-actions, overzichtelijke productpagina's.
- **Ingericht op groei**: eenvoudig uit te breiden en technisch geoptimaliseerd.

## 2. Wat de B2B-shop moet kunnen (functionele scope)

### MVP (fase 1, eerst live)
| Gebied | Functie |
|---|---|
| Toegang | Alleen inloggen voor goedgekeurde zakelijke klanten; aanvraagformulier voor nieuwe dealers (KvK, btw-nummer, afleveradres) met handmatige goedkeuring. |
| Catalogus | Alle producten met eigen B2B-informatie: inhoud, omdoos (bijv. 12 stuks), EAN, voedingswaarden, foto's. Gefilterd op diersoort / type snack. |
| Prijzen | Klantspecifieke prijslijsten (bijv. `Dealer`, `Groothandel`, `Key account`), staffelprijzen per hoeveelheid, prijzen excl. btw, minimale orderwaarde en franco-grens. |
| Bestellen | Snelbestellen op SKU, bestellijsten/favorieten, "opnieuw bestellen" vanuit orderhistorie, winkelwagen met omdoos-veelvouden. |
| Orders | Orderoverzicht en -status (ontvangen → verwerkt → verzonden → gefactureerd), orderbevestiging per mail. |
| Beheer | Admin-paneel: klanten goedkeuren, prijslijsten koppelen, orders afhandelen, voorraad zien. |

### Fase 2
- Koppeling boekhouding (Exact Online / Moneybird / e-Boekhouden): factuur automatisch aanmaken.
- Betaalopties: op rekening (standaard B2B), iDEAL/Mollie als alternatief.
- Verzendkoppeling (Sendcloud / MyParcel) voor labels en track & trace.
- Backorders en verwachte leverdatum.

### Fase 3
- Dealerportaal met marketingmateriaal (productfoto's, schapkaarten) om te downloaden.
- Automatische herbestel-suggesties op basis van bestelritme.
- Meertaligheid (DE/EN) voor export.

## 3. Architectuur

```
┌─────────────────┐     HTTPS/JSON     ┌──────────────────┐      ┌──────────────┐
│  apps/web       │ ─────────────────▶ │  apps/api        │ ───▶ │ PostgreSQL   │
│  Next.js (NL)   │                    │  Fastify + Prisma│      │              │
│  dealerportaal  │ ◀───────────────── │  REST-API        │      └──────────────┘
│  + admin        │                    │                  │
└─────────────────┘                    │  Integraties:    │ ───▶ Shopify Admin API (producten/voorraad)
                                       │                  │ ───▶ Boekhouding (fase 2)
                                       │                  │ ───▶ Verzending (fase 2)
                                       └──────────────────┘
```

**Keuzes**
- **Monorepo (pnpm workspaces)**: één repository, twee apps die los deployen.
- **API: Node.js + TypeScript + Fastify + Prisma + PostgreSQL.** Snel, goed gedocumenteerd,
  één taal voor front- en back-end. Prisma geeft een leesbaar datamodel en migraties.
- **Web: Next.js (App Router).** Server-side rendering voor snelle catalogus, eenvoudige
  deploy op Vercel of eigen server.
- **Producten: Shopify blijft de bron.** Producten, foto's en voorraad worden gesynct
  vanuit Shopify (Admin API) zodat je ze niet dubbel beheert. B2B-specifieke velden
  (omdoos, EAN, inkoopprijs) staan in de eigen database.
- **Prijzen & klanten staan nooit in Shopify**; dat is het hart van de B2B-shop.
- **Authenticatie:** e-mail + wachtwoord, JWT in httpOnly-cookie. Rollen: `ADMIN`
  (WicoTreats) en `CUSTOMER` (dealer-medewerker). Een klant hoort bij een `Company`.

## 4. Datamodel (kern)

- `Company` — zakelijke klant: naam, KvK, btw-nr, factuur-/afleveradres, status
  (`PENDING`/`ACTIVE`/`BLOCKED`), betaaltermijn, gekoppelde `PriceList`.
- `User` — inlogaccount, rol, hoort bij een Company (admins niet).
- `Product` + `ProductVariant` — gesynct uit Shopify; met `caseSize` (omdoos), `ean`,
  `b2bActive`.
- `PriceList` + `PriceListItem` — prijs per variant per prijslijst, met optionele
  `minQty` voor staffels.
- `Order` + `OrderLine` — vastgelegde prijzen op moment van bestellen, status,
  referentie van de klant, totaalbedragen excl./incl. btw.
- `OrderList` (favorieten/bestellijsten) — fase 1b.

Zie `apps/api/prisma/schema.prisma`.

## 5. Hosting & beheer

| Onderdeel | Aanbeveling |
|---|---|
| Web | Vercel (gratis tier volstaat om te starten) of dezelfde server als de API. |
| API + database | Railway, Fly.io of een Hetzner-VPS met Docker Compose. Begin klein (~€10–20/maand). |
| Domein | `b2b.wicotreats.com` → web, `api.wicotreats.com` → API. |
| Mail | Resend of Postmark voor orderbevestigingen (transactionele mail). |
| Backups | Dagelijkse Postgres-dump; database is het enige dat echt uniek is. |

## 6. Stappenplan

1. **Week 1 – fundament (deze stap).** Repo-structuur, datamodel, API met login,
   catalogus met klantprijs, order plaatsen. Lokaal draaien met Docker.
2. **Week 2 – dealerportaal.** Next.js: inloggen, catalogus, snelbestellen, winkelwagen,
   orderhistorie. Shopify-sync van producten en voorraad.
3. **Week 3 – beheer.** Adminpagina's: klanten goedkeuren, prijslijsten, orderstatus.
   Orderbevestiging per mail. Eerste testdealers uitnodigen.
4. **Week 4 – live.** Hosting, domein, backups, monitoring. Daarna fase 2.

## 7. Open vragen (beslissen vóór week 2)

1. Welke prijsgroepen zijn er nu feitelijk? (bijv. dealer / groothandel / key account)
2. Verkoop je B2B per stuk of uitsluitend per omdoos? Hoeveel stuks per omdoos per product?
3. Betalen dealers op rekening (14/30 dagen) of vooraf?
4. Welk boekhoudpakket gebruik je (Exact, Moneybird, e-Boekhouden, anders)?
5. Moet voorraad gedeeld worden tussen B2C (Shopify) en B2B, of krijgt B2B eigen voorraad?
6. Verzenden via Sendcloud/MyParcel, of eigen bezorging?
