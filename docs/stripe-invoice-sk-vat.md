# Stripe faktúry — náležitosti podľa SK DPH (§ 74)

JOBBIE vystavuje faktúry cez [Stripe Invoicing](https://docs.stripe.com/invoicing) a [Billing Subscriptions](https://docs.stripe.com/billing/subscriptions/overview). PDF a e-mail spravuje Stripe; údaje dodávateľa a odberateľa musia byť kompletné v Stripe aj v checkoute `/platba`.

Pre doručenie e-mailom pozri [stripe-invoice-emails.md](./stripe-invoice-emails.md).

---

## Dodávateľ (CoCreate s. r. o.)

**PDF hlavička dodávateľa = výhradne Stripe Dashboard → Business details** (test aj live). API env `BILLING_SUPPLIER_*` zrkadlí údaje len v aplikácii `/nastavenia/fakturacia/:id` — **neprepíše** letterhead na Stripe PDF.

Nastavte v **Stripe Dashboard** (test aj live) — musí zodpovedať fakturačným vzorom:

| Údaj | Hodnota |
|------|---------|
| Obchodné meno | CoCreate s. r. o. |
| Adresa sídla | Aktuálna adresa (nie testová zahraničná) |
| Telefón | SK číslo podpory (nie US test +1…) |
| IČO | 56273975 |
| DIČ | 2122295694 |
| IČ DPH | SK2122259634 |
| OR | Zapísaná v OR OS Žilina, oddiel Sro, vložka č. 85095/L |

| Údaj § 74 | Kde v Stripe |
|-----------|----------------|
| Názov / meno zdaniteľnej osoby | [Settings → Business details](https://dashboard.stripe.com/settings/business) |
| Adresa sídla | Business details |
| IČ DPH (identifikačné číslo pre daň) | [Settings → Tax IDs](https://dashboard.stripe.com/settings/tax) — typ **eu_vat** (`SK` + 10 číslic); len identifikácia, nie „platiteľ DPH“ na predaji |
| IČO / DIČ (ak potrebujete na PDF) | Business details / verejné údaje alebo poznámka v pätičke faktúry |
| Poradové číslo faktúry | [Settings → Billing → Invoice numbering](https://dashboard.stripe.com/settings/billing/invoice) |
| Sadzba DPH, základ, výška dane | Len ak zapnete **Stripe Tax** (`STRIPE_INVOICE_AUTOMATIC_TAX=true`) — inak faktúra bez DPH |

Voliteľne v `backend-ts/.env`:

- `STRIPE_ACCOUNT_TAX_IDS=txi_...,txi_...` — ID daňových identifikátorov účtu (z Dashboard → Tax IDs), ak máte viac ako jeden
- `STRIPE_INVOICE_FOOTER=` — voliteľná vlastná pätička PDF (inak len poznámka z API)
- `STRIPE_INVOICE_AUTOMATIC_TAX=true` — zapne automatický výpočet DPH cez API (predvolene **vypnuté**)
- `BILLING_SUPPLIER_*` — blok dodávateľa v aplikácii `/nastavenia/fakturacia/:id` (predvolene CoCreate s. r. o.; zrkadlo Stripe Business details)
- `BILLING_SUPPLIER_OR` — zápis v obchodnom registri na PDF / v aplikácii

---

## Vzor faktúry (4 typy)

Backend nastavuje texty podľa typu platby:

| Typ | Popis položky | Množstvo / jednotka | Poznámka |
|-----|---------------|---------------------|----------|
| Predaj kreditov (firma / FO) | Kredity na využívanie online platformy (N kreditov) | 1 / **balík** | Poskytnutie virtuálnych kreditov… |
| Mesačné predplatné (firma / FO) | Mesačné predplatné online platformy | 1 / mesiac | Poskytnutie prístupu… + obdobie predplatného |

- **Kredity** — jeden riadok: `quantity: 1`, cena balíka; popis na faktúre (`description` / memo): *Kredity na využívanie online platformy*; po `payment_intent.succeeded` sa faktúra zaplatí cez `attachPayment` (bez `payment_settings`).
- **Predplatné** — webhook `invoice.created` doplní popis riadku, poznámku a obdobie predplatného na draft faktúre pred finalizáciou; otvorené faktúry majú `payment_settings: card`.

Číslovanie faktúr: prefix `2026` v [Invoice numbering](https://dashboard.stripe.com/settings/billing/invoice) (napr. `20260001`).

---

## Symboly a platba (SK formát)

| Pole | Hodnota | Kde |
|------|---------|-----|
| **Variabilný symbol** | = číslo faktúry (`invoice.number`) | Stripe číslovanie v Dashboard; v aplikácii zobrazené explicitne |
| **Konštantný symbol** | — (nové faktúry ho neobsahujú) | Staré faktúry môžu mať hodnotu v `custom_fields` |
| **Spôsob úhrady** | Kartou / online (nie prevodom) | API: `payment_method_types: ['card']` na PI / otvorených faktúrach — **bez** bank transfer / Pay by Square |

Stripe povolí najviac **4** vlastné polia na faktúre. Pri firme: IČO, DIČ, IČ DPH (max. 3 polia). Variabilný symbol preto zodpovedá **číslu faktúry** v hlavičke PDF.

Backend pri každej faktúre nastaví aj `rendering.pdf.page_size: a4` a `preferred_locales: sk` na zákazníkovi.

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
2. Pri firme: **IČO**, **DIČ** a **IČ DPH** v `custom_fields` na faktúre (label „IČ DPH“) — **nie** duplicitné `eu_vat` na Customer (Stripe by zobrazil „SK VAT“ dvakrát)
3. Pri fyzickej osobe: meno z platobného formulára (Payment Element) + adresa z polí ulica, mesto, PSČ na `/platba`

| Náležitosť § 74 | Firma | Fyzická osoba |
|-----------------|-------|----------------|
| Názov odberateľa | Stripe Tax ID element (názov firmy) | Meno v Customer / platobnom formulári |
| Adresa odberateľa | Polia ulica, mesto, PSČ na `/platba` | Polia ulica, mesto, PSČ na `/platba` |
| IČ DPH odberateľa | Custom field „IČ DPH“ | — |
| IČO / DIČ | Custom fields IČO, DIČ | — |

Pri ďalšom checkoute sa staré `eu_vat` tax ID na Customer zmažú (ak nie je zapnutý automatic tax). Ak chýba adresa, API vráti chybu s výzvou vyplniť fakturačnú adresu vo formulári platby.

---

## DPH na faktúre (sadzba, základ, suma)

CoCreate **nie je platiteľom DPH pri predaji** — predvolená pätička uvádza faktúru bez DPH. IČ DPH dodávateľa slúži na identifikáciu pri nadobúdaní služieb zo zahraničia.

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
5. Skontrolujte: jeden riadok balík (nie 0,666 € × 30), hlavička dodávateľa z Dashboard, odberateľ IČO/DIČ/IČ DPH bez duplicitnej „SK VAT“, **žiadny** IBAN / Pay by Square / „Zaplatiť online“ na uhradenej kreditovej faktúre, pätička bez „platiteľom DPH“.
6. V aplikácii `/nastavenia/fakturacia/:id` — symboly, dátumy a „Kartou / online platba“.

Kód: [`backend-ts/src/payments/stripe-invoice-sk.ts`](../backend-ts/src/payments/stripe-invoice-sk.ts), [`stripe.service.ts`](../backend-ts/src/payments/stripe.service.ts).
