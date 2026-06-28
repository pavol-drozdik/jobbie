# Stripe faktúry — náležitosti podľa SK DPH (§ 74)

JOBBIE vystavuje faktúry cez [Stripe Invoicing](https://docs.stripe.com/invoicing) a [Billing Subscriptions](https://docs.stripe.com/billing/subscriptions/overview). PDF a e-mail spravuje Stripe; údaje dodávateľa a odberateľa musia byť kompletné v Stripe aj v checkoute `/platba`.

Pre doručenie e-mailom pozri [stripe-invoice-emails.md](./stripe-invoice-emails.md).

---

## Dodávateľ (CoCreate s. r. o.)

**PDF hlavička dodávateľa = Stripe Dashboard → Business details** (test aj live). API dopĺňa **IČO, DIČ, IČ DPH** dodávateľa a odberateľa do dvoch **custom fields** (`Dodávateľ` | `Odberateľ`) v hlavičke PDF; **pätička** obsahuje len zápis v OR (`buildSkInvoiceFooter`). `BILLING_SUPPLIER_*` zrkadlí údaje aj v aplikácii `/nastavenia/fakturacia/:id`.

Nastavte v **Stripe Dashboard** (test aj live) — musí zodpovedať fakturačným vzorom:

| Údaj | Hodnota |
|------|---------|
| Obchodné meno | CoCreate s. r. o. |
| Adresa sídla | Aktuálna adresa (nie testová zahraničná) |
| Telefón | SK číslo podpory (nie US test +1…) |
| IČO | 56273975 |
| DIČ | 2122295694 |
| IČ DPH | SK2122259634 |
| OR | Spoločnosť je zapísaná v Obchodnom registri Okresného súdu Žilina v oddiele Sro vložka č. 85095/L |

| Údaj § 74 | Kde v Stripe |
|-----------|----------------|
| Názov / meno zdaniteľnej osoby | [Settings → Business details](https://dashboard.stripe.com/settings/business) |
| Adresa sídla | Business details |
| IČ DPH (identifikačné číslo pre daň) | [Settings → Tax IDs](https://dashboard.stripe.com/settings/tax) — typ **eu_vat** (`SK` + 10 číslic); len identifikácia, nie „platiteľ DPH“ na predaji |
| IČO / DIČ | Custom field **Dodávateľ** (`BILLING_SUPPLIER_*` / predvolené CoCreate) |
| OR | Pätička faktúry z API (`BILLING_SUPPLIER_OR` / predvolený text) |
| Poradové číslo faktúry | [Settings → Billing → Invoice numbering](https://dashboard.stripe.com/settings/billing/invoice) |
| Sadzba DPH, základ, výška dane | Len ak zapnete **Stripe Tax** (`STRIPE_INVOICE_AUTOMATIC_TAX=true`) — inak faktúra bez DPH |

Voliteľne v `backend-ts/.env`:

- `STRIPE_ACCOUNT_TAX_IDS=txi_...,txi_...` — ID daňových identifikátorov účtu (z Dashboard → Tax IDs), ak máte viac ako jeden
- `STRIPE_INVOICE_AUTOMATIC_TAX=true` — zapne automatický výpočet DPH cez API (predvolene **vypnuté** — identifikovaná osoba bez DPH na predaji)
- `BILLING_SUPPLIER_*` — IČO/DIČ/IČ DPH v custom field Dodávateľ, OR v pätičke PDF a v aplikácii (predvolene CoCreate s. r. o.)

---

## Mapovanie § 74 ods. 1 → Stripe (identifikovaná osoba, bez DPH na predaji)

| § 74 | Náležitosť | Kde na Stripe PDF / API |
|------|------------|-------------------------|
| a | Dodávateľ — názov, sídlo, IČ DPH | Business details + Tax IDs (`eu_vat`); IČO/DIČ/IČ DPH v custom field **Dodávateľ** |
| b | Odberateľ — názov, adresa, IČ DPH | Customer `name` + `address`; firma: custom field **Odberateľ** (IČO · DIČ · IČ DPH) |
| c | Poradové číslo | `invoice.number` (Dashboard numbering) |
| d | Dátum dodania / platby | Custom field **Dátum dodania** (= dátum vystavenia); platba podľa `paid_at` |
| e | Dátum vyhotovenia | `finalized_at` |
| f | Množstvo a druh služby | Line item popis + qty |
| g | Základ, jednotková cena bez dane | `rendering.amount_tax_display: exclude_tax` |
| h | Oslobodenie od dane | Mimo Stripe PDF (účtovníctvo / interná dokumentácia); Stripe footer = OR |
| i | Výška dane | 0,00 € v predvolenom exemption texte |
| j–n | Špeciálne režimy | N/A pre SaaS |

**Obmedzenie Stripe:** IČO/DIČ/IČ DPH sú v **custom fields** (Dodávateľ | Odberateľ), nie v stĺpci „Na účet“. Hodnota max. 140 znakov — ID sa zobrazujú v jednom riadku oddelené ` · `.

---

## Vzor faktúry (4 typy)

Backend nastavuje texty podľa typu platby:

| Typ | Popis položky | Množstvo / jednotka | Poznámka |
|-----|---------------|---------------------|----------|
| Predaj kreditov (firma / FO) | Kredity na využívanie online platformy (N kreditov) | 1 / **balík** | Poznámka v aplikácii (`note`), nie na Stripe PDF |
| Mesačné predplatné (firma / FO) | Mesačné predplatné online platformy | 1 / mesiac | Obdobie predplatného v aplikácii |

- **Kredity** — jeden riadok: `quantity: 1`, cena balíka; popis na faktúre (`description` / memo): *Kredity na využívanie online platformy*; po `payment_intent.succeeded` sa faktúra zaplatí cez `attachPayment` (bez `payment_settings`).
- **Predplatné** — po `subscriptions.create` backend okamžite doplní draft faktúru (`stampSkSubscriptionInvoiceFromSubscription`); pri checkoute nastaví `Customer.invoice_settings.footer` (OR riadok aj keď sa €0 trial faktúra stihne finalizovať pred webhookom); webhook `invoice.created` doplní popis riadku, custom fields Dodávateľ/Odberateľ a OR pätičku na draft faktúre pred finalizáciou; otvorené faktúry majú `payment_settings: card`.

Číslovanie faktúr: prefix `2026` v [Invoice numbering](https://dashboard.stripe.com/settings/billing/invoice) (napr. `20260001`).

---

## Symboly a platba (SK formát)

| Pole | Hodnota | Kde |
|------|---------|-----|
| **Variabilný symbol** | = číslo faktúry (`invoice.number`) | Stripe číslovanie v Dashboard; v aplikácii zobrazené explicitne |
| **Konštantný symbol** | — (nové faktúry ho neobsahujú) | Staré faktúry môžu mať hodnotu v `custom_fields` |
| **Spôsob úhrady** | Kartou / online (nie prevodom) | API: `payment_method_types: ['card']` na PI / otvorených faktúrach — **bez** bank transfer / Pay by Square |

Stripe povolí najviac **4** vlastné polia na faktúre. JOBBIE používa **3** pri firme: `Dátum dodania`, `Dodávateľ`, `Odberateľ` (FO: prvé dve). Variabilný symbol zodpovedá **číslu faktúry** v hlavičke PDF.

Backend pri každej faktúre nastaví `rendering.pdf.page_size: a4`, `rendering.amount_tax_display: exclude_tax` a `preferred_locales: sk` na zákazníkovi.

---

## Stripe Dashboard — kontrolný zoznam (test aj live)

1. **[Invoice numbering](https://dashboard.stripe.com/settings/billing/invoice)** — číslovanie na úrovni účtu; prefix prázdny alebo číselný (napr. `2026007`), nie `PREFIX-0001`, ak to vyžaduje vaša účtovníctvo. Nastavte **Next invoice sequence** podľa existujúcej série.
2. **Platobné metódy na faktúrach** — vypnite **Bank transfer** / `customer_balance`. Nechajte **Card** (Apple Pay / Google Pay cez Payment Element).
3. **[Business details](https://dashboard.stripe.com/settings/business)** + **[Tax IDs](https://dashboard.stripe.com/settings/tax)** — úplný blok dodávateľa (adresa, SK telefón).
4. **Public business information** — e-mail a telefón podpory na PDF.
5. **PDF** — A4 (API to tiež nastavuje); SK lokalizácia PDF cez `preferred_locales: sk` na Customer.
6. **[Branding](https://dashboard.stripe.com/settings/branding)** — veľký názov/logotyp v pravom hornom rohu PDF je **Logo alebo Icon** z Branding nastavení (nie z nášho API). Ak vyzerá ako watermark s názvom firmy, **odstráňte Logo** (prípadne nahraďte neutrálnou ikonou bez textu). API to na štandardnom účte nevie vypnúť.
7. **[Invoice settings](https://dashboard.stripe.com/settings/billing/invoice)** — vypnite **Include a link to a payment page** (inak „Zaplatiť online“ v pätičke PDF aj na uhradených faktúrach).

---

## Odberateľ (zákazník JOBBIE)

Pri `/platba` backend pred finalizáciou faktúry:

1. Nastaví **Stripe Customer** — meno/názov, e-mail, **adresu**, `preferred_locales: sk`
2. Pri firme: custom field **Odberateľ** (IČO · DIČ · IČ DPH) — **nie** duplicitné `eu_vat` na Customer (Stripe by zobrazil „SK VAT“ dvakrát)
3. Pri fyzickej osobe: meno z platobného formulára (Payment Element) + adresa z polí ulica, mesto, PSČ na `/platba`; custom field **Dodávateľ** (IČO · DIČ · IČ DPH)

| Náležitosť § 74 | Firma | Fyzická osoba |
|-----------------|-------|----------------|
| Názov odberateľa | Stripe Tax ID element (názov firmy) | Meno v Customer / platobnom formulári |
| Adresa odberateľa | Polia ulica, mesto, PSČ na `/platba` | Polia ulica, mesto, PSČ na `/platba` |
| IČ DPH odberateľa | Custom field **Odberateľ** | — |
| IČO / DIČ odberateľa | Custom field **Odberateľ** | — |

Pri ďalšom checkoute sa staré `eu_vat` tax ID na Customer zmažú (ak nie je zapnutý automatic tax). Ak chýba adresa, API vráti chybu s výzvou vyplniť fakturačnú adresu vo formulári platby.

---

## DPH na faktúre (sadzba, základ, suma)

CoCreate má **IČ DPH** (identifikovaná osoba), ale **neúčtuje DPH na predaji** JOBBIE služieb. Text oslobodenia od dane nie je na Stripe PDF (pätička = zápis v OR). V aplikácii `/nastavenia/fakturacia/:id` zostáva pole `note` s popisom služby.

Ak neskôr zapnete Stripe Tax:

1. **Stripe Tax** — v Dashboard zapnite [Stripe Tax](https://dashboard.stripe.com/tax) pre Slovensko; backend posiela `automatic_tax: { enabled: true }` len keď `STRIPE_INVOICE_AUTOMATIC_TAX=true`.
2. Pri automatic tax sa môže `eu_vat` na Customer znova vytvárať pre výpočet dane.

---

## Čo Stripe doplní automaticky

- Poradové číslo, dátum vyhotovenia, dátum dodania / platby (podľa stavu faktúry)
- Množstvo, popis položky (z Price / line item)
- Meno a DPH dodávateľa z účtu Stripe

## Čo musíte mať vyplnené vy

- Úplné údaje **dodávateľa** v Stripe Dashboard (live + test) — **toto určuje PDF**
- Pri firme na checkout: názov, IČ DPH, IČO, DIČ, **adresa**
- Zapnuté e-maily podľa [stripe-invoice-emails.md](./stripe-invoice-emails.md)

---

## Overenie

1. Reštartujte `backend-ts` po deployi.
2. V Stripe Dashboard (**rovnaký režim ako platba** — test vs live) opravte Business details + Tax IDs.
3. Test platba na `/platba` (firma s adresou).
4. Stripe Dashboard → **Invoices** → otvorte **novú** zaplatenú faktúru → **Invoice PDF**.
5. Skontrolujte: jeden riadok balík (nie 0,666 € × 30), hlavička dodávateľa z Dashboard, custom fields **Dodávateľ** a **Odberateľ** (firma) s IČO/DIČ/IČ DPH, pätička len so zápisom v OR, **žiadny** IBAN / Pay by Square / „Zaplatiť online“ na uhradenej kreditovej faktúre.
6. V aplikácii `/nastavenia/fakturacia/:id` — symboly, dátumy a „Kartou / online platba“.

Kód: [`backend-ts/src/payments/stripe-invoice-sk.ts`](../backend-ts/src/payments/stripe-invoice-sk.ts), [`stripe.service.ts`](../backend-ts/src/payments/stripe.service.ts).
