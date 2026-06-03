# Stripe faktúry — náležitosti podľa SK DPH (§ 74)

JOBBIE vystavuje faktúry cez [Stripe Invoicing](https://docs.stripe.com/invoicing) a [Billing Subscriptions](https://docs.stripe.com/billing/subscriptions/overview). PDF a e-mail spravuje Stripe; údaje dodávateľa a odberateľa musia byť kompletné v Stripe aj v checkoute `/platba`.

Pre doručenie e-mailom pozri [stripe-invoice-emails.md](./stripe-invoice-emails.md).

---

## Dodávateľ (váš Stripe účet — JOBBIE prevádzkovateľ)

Nastavte v **Stripe Dashboard** (test aj live):

| Údaj § 74 | Kde v Stripe |
|-----------|----------------|
| Názov / meno zdaniteľnej osoby | [Settings → Business details](https://dashboard.stripe.com/settings/business) |
| Adresa sídla | Business details |
| IČ DPH (identifikačné číslo pre daň) | [Settings → Tax IDs](https://dashboard.stripe.com/settings/tax) — typ **eu_vat** (`SK` + 10 číslic) |
| IČO / DIČ (ak potrebujete na PDF) | Business details / verejné údaje alebo poznámka v pätičke faktúry |
| Poradové číslo faktúry | [Settings → Billing → Invoice numbering](https://dashboard.stripe.com/settings/billing/invoice) |
| Sadzba DPH, základ, výška dane | **Stripe Tax** (odporúčané) alebo daň na Price — pozri nižšie |

Voliteľne v `backend-ts/.env`:

- `STRIPE_ACCOUNT_TAX_IDS=txi_...,txi_...` — ID daňových identifikátorov účtu (z Dashboard → Tax IDs), ak máte viac ako jeden
- `STRIPE_INVOICE_FOOTER=` — vlastná pätička PDF (inak predvolený text o zákone o DPH)
- `STRIPE_INVOICE_AUTOMATIC_TAX=false` — vypne automatický výpočet DPH cez API (predvolene zapnuté, ak Stripe Tax funguje)

---

## Odberateľ (zákazník JOBBIE)

Pri `/platba` backend pred finalizáciou faktúry:

1. Nastaví **Stripe Customer** — meno/názov, e-mail, **adresu**, `preferred_locales: sk`
2. Pri firme: **IČ DPH** ako `eu_vat` (nie DIČ), **IČO** a **DIČ** v `custom_fields` na faktúre
3. Pri fyzickej osobe: meno z platobného formulára (Payment Element) + adresa z polí ulica, mesto, PSČ na `/platba`

| Náležitosť § 74 | Firma | Fyzická osoba |
|-----------------|-------|----------------|
| Názov odberateľa | Stripe Tax ID element (názov firmy) | Meno v Customer / platobnom formulári |
| Adresa odberateľa | Polia ulica, mesto, PSČ na `/platba` | Polia ulica, mesto, PSČ na `/platba` |
| IČ DPH odberateľa | Pole IČ DPH (EU VAT) | — |
| IČO / DIČ | Polia IČO, DIČ | — |

Ak chýba adresa, API vráti chybu s výzvou vyplniť fakturačnú adresu vo formulári platby.

---

## DPH na faktúre (sadzba, základ, suma)

Stripe musí na riadkoch faktúry uviesť základ a DPH:

1. **Stripe Tax** — v Dashboard zapnite [Stripe Tax](https://dashboard.stripe.com/tax) pre Slovensko; backend posiela `automatic_tax: { enabled: true }` pri vytvorení faktúry / predplatného.
2. Ak Tax nie je aktivovaný, API skúsi faktúru bez automatic_tax (log) — **overte PDF manuálne** a doplňte daň v Stripe alebo na cenách.

---

## Čo Stripe doplní automaticky

- Poradové číslo, dátum vyhotovenia, dátum dodania / platby (podľa stavu faktúry)
- Množstvo, popis položky (z Price / line item)
- Meno a DPH dodávateľa z účtu Stripe

## Čo musíte mať vyplnené vy

- Úplné údaje **dodávateľa** v Stripe Dashboard (live + test)
- Pri firme na checkout: názov, IČ DPH, IČO, DIČ, **adresa**
- Zapnuté e-maily podľa [stripe-invoice-emails.md](./stripe-invoice-emails.md)

---

## Overenie

1. Test platba na `/platba` (firma s adresou).
2. Stripe Dashboard → **Invoices** → otvorte zaplatenú faktúru → **Invoice PDF**.
3. Skontrolujte hlavičku (dodávateľ, odberateľ, IČO/DIČ/IČ DPH), riadky s DPH a pätičku.

Kód: [`backend-ts/src/payments/stripe-invoice-sk.ts`](../backend-ts/src/payments/stripe-invoice-sk.ts), [`stripe.service.ts`](../backend-ts/src/payments/stripe.service.ts).
