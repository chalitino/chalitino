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

## 7. Beslissingen (14 nov 2026)

| # | Vraag | Besluit | Hoe gebouwd |
|---|---|---|---|
| 1 | Prijsgroepen | Eén prijslijst. Geen account = geen prijs. Prijzen excl. btw; btw bij afrekenen. NL: 9% btw. EU met geldig btw-nummer: btw verlegd. Buiten EU: 0%. Uitsluitend zakelijk. | `VatScheme` per order; `determineVatScheme()` o.b.v. afleverland + `Company.vatValidated`. VIES-check via `POST /admin/companies/:id/check-vat`, met handmatige goedkeuring als fallback. Buiten NL is btw-nummer verplicht bij aanvraag. |
| 2 | Eenheden | B2B in bulk én per verpakking (bv. 5 st of 100 g). | `ProductVariant.unitType` (`PACK`/`BULK`) + `packContent`. Een product kan meerdere B2B-eenheden hebben met elk een eigen SKU, prijs en voorraad. Shopify-varianten komen binnen als `PACK`. |
| 3 | Betaling | Eerste twee orders vooruitbetalen, daarna binnen 14 dagen. | `Company.prepaidOrders` (2) en `paymentTermDays` (14), per klant aanpasbaar. `Order.paymentTerms` wordt bij plaatsen bepaald op basis van het aantal betaalde orders. Verzenden van een vooruitbetaalde order is geblokkeerd tot `paymentStatus = PAID`. |
| 4 | Boekhouding | Handmatig, op basis van bankbijschrift. | Medewerker klikt "Markeer als betaald" bij bijschrijving; `paidAt` wordt vastgelegd. Geen boekhoudkoppeling. Factuur-PDF volgt in fase 1b. |
| 5 | Voorraad | Niet gedeeld met Shopify; B2B heeft eigen voorraad. | Voorraad = som van `Batch.qtyRemaining`. Shopify-sync haalt alleen producten/prijzen, geen voorraad. |
| 6 | Verzending | Sendcloud. | Nu: trackingcode per order invoeren. Fase 2: Sendcloud-API koppelen (parcel aanmaken vanuit order, label printen, track & trace automatisch terug). |
| 7 | Medewerker-login met THT/batch | Inkomende orders voor medewerkers; batch en THT automatisch gekoppeld. | Rol `STAFF`. Bij elke order wijst `allocateFefo()` batches toe met de kortste THT eerst (First Expired, First Out) en boekt voorraad af; annulering geeft terug. Beheerscherm toont per orderregel batch + THT (pakbon) en per batch welke orders hem kregen (traceerbaarheid, recall). |

## 8. Huisstijl en documenten (14 nov 2026)

De huisstijl is overgenomen uit de Order Printer Pro-sjablonen van wicotreats.com en staat op één plek
(`apps/api/src/lib/brand.ts` voor mails/documenten, `apps/web/app/globals.css` voor het portaal):
Gluten (koppen), Rethink Sans (tekst), IBM Plex Mono (codes), warm bruin `#4A3933`, crème `#FBF6EE`,
roest `#9A5B2E`, de tienkleurige strook, het zegel "WicoTreats · Swalmen · sinds 1993", bedrijfsgegevens
(Wico Diervoeding V.O.F., KvK 13033716, BTW NL806311551B01, NVWA 7346, IBAN NL69 INGB 0682 8682 05).

**Taalregel** (zoals in de sjablonen): Nederlands voor NL/BE, Engels voor alle andere landen; per klant
te overschrijven in beheer.

| Onderdeel | Status |
|---|---|
| E-mails: orderbevestiging (met betaalinstructies bij vooruitbetaling), verzendbericht met track & trace en factuurnummer, aanvraag ontvangen, account goedgekeurd, interne melding nieuwe order/aanvraag | Klaar. Provider instelbaar: `console` (dev), `resend`, `smtp`. |
| Pakbon met per regel partij, THT en analyse, vinkvakjes en handtekeningvelden | Klaar, `GET /admin/orders/:id/pakbon` (printen / opslaan als PDF). |
| Factuur met btw per regel of verlegd, betaalinstructies, betaald-stempel, opvolgend factuurnummer `F2026-0001` (toegekend bij verzending of eerste opvraag) | Klaar, `GET /admin/orders/:id/factuur`; dealer ziet eigen factuur in "Mijn orders". |
| Analyse per batch (Vocht · E · V · A) | Klaar, in te voeren bij inboeken; staat op de pakbon (in het Engels vertaald naar Moisture/Protein/Fat/Ash). |

## 8b. Shopify-thema als ontwerpbron (14 nov 2026)

Het geëxporteerde thema `wicotreats-b2b-nieuw-thema-d2` is de ontwerpbron voor het portaal. Overgenomen:
tokens uit `assets/b2b-wico.css` (crème `#FBF6EE`, bruin `#4A3933`/`#2E221E`, lijn `#E3D6C2`, zacht
`#F1E4CC`, roest `#9A5B2E`, goud `#EAC88E`, ok/warn/bad), hoekige knoppen in kapitalen, eyebrow met driekleurig
blokje, tabellen, pills, voorraadstip; de secties `b2b-header`, `b2b-footer`, `b2b-login` (e-mailcode),
`b2b-register`, `b2b-account`, `b2b-order` en `quick-order` (per diersoort, vaste balk "Alles in de wagen",
CSV-download, voetnoot). Het woordmerk is de tekst-SVG uit `snippets/logo-woordmerk.liquid`; het logo-bestand
zelf zit niet in de export (Shopify-hosted) en kan later via `BRAND_LOGO_URL` worden toegevoegd. Diersoortkleuren
staan in `apps/web/lib/brand.tsx` (in het thema een metaobject) en zijn aan te passen.

## 8c. Logo's (14 nov 2026)

Officiële logobestanden staan in `apps/web/public/brand/`: monogram (de W) in bruin-op-crème, bruin-op-kip en
crème-op-bruin, het gestapelde logo "wico / treats" in bruin en crème, en een daaruit samengestelde liggende
variant "wico treats" (SVG + PNG voor e-mail). Logokleuren: bruin `#3B2416`, crème `#F3E6CF`, kip `#F0B43A`.
Letterpaden staan in `logo-paths.json` (web en api) en worden inline gebruikt in header, footer, pakbon en
factuur; e-mails tonen de PNG via `BRAND_LOGO_URL` (standaard `<WEB_ORIGIN>/brand/wicotreats-horizontal-bruun.png`).
Favicon en app-icoon: monogram op kip-geel.

## 8d. Kleuren uit het BRUUN-merkhandboek (05 · Kleur, 14 nov 2026)

| Naam | Hex | Gebruik |
|---|---|---|
| Bruun | `#3B2416` | tekst, logo, knoppen, footer |
| Crème | `#F3E6CF` | achtergrond, invoervelden |
| Crème-diep | `#EAD9BA` | vlakken: kaarten, tabelkoppen, header, meldingen |
| Bruun-diep | `#2C1A0F` | hover, bulk-tegel |
| Rund-inkt | `#B8321C` | alleen tekst op crème: accentwoorden in koppen, links, "slecht"-status |
| Kip | `#F0B43A` | gouden knop "Alles in de wagen", waarschuwing |

Dierkleuren (tegels, snelbestel-groepen, dierenstrook in deze volgorde): Rund `#E0452C`, Kip `#F0B43A`,
Kalkoen `#D9824A`, Eend `#B5A58A`, Lam `#C4956A`, Geit `#A8A060`, Hert `#9DB88A`, Zwijn `#E8955A`,
Paard `#A67C6D`, Konijn `#C98BB0`, Kameel `#D4B483`, Vis `#8FBCE6`, Supplementen `#8FA67A`.

Regels die zijn doorgevoerd: tekst en logo op een dierkleur altijd bruun; kleine tekst op een dierkleur staat op
een crème chip; geen verlopen, geen zwart, geen wit (documenten worden op wit papier geprint, de band en vlakken
zijn crème). Tokens: `apps/web/app/globals.css`, `apps/web/lib/brand.tsx`, `apps/api/src/lib/brand.ts`.

## 9. Volgende stappen

1. E-mailprovider kiezen en instellen (Resend-account of SMTP van wicotreats.com); logo-URL invullen.
2. Sendcloud-koppeling: label + track & trace automatisch terug in de verzendmail.
3. Shopify-sync draaien voor alle 142 producten; B2B-eenheden (100 g, bulk) per product aanmaken en prijzen importeren via CSV.
4. Hosting: web op Vercel, API + Postgres op Railway/Fly/Hetzner; domein `b2b.wicotreats.com`.
5. Facturen ook als echte PDF-bijlage bij de verzendmail (nu: link naar printbare factuur).
