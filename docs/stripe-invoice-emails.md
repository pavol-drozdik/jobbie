# Stripe automatic invoice emails (no Resend)

JOBBIE does **not** send billing emails via the app SMTP service. Paid **faktúry** (invoice PDF + hosted invoice page) are delivered by **Stripe** when you enable the correct Dashboard settings (test **and** live).

Checkout creates Stripe `Invoice` objects:

- **Credits** — standalone PaymentIntent on `/platba`; after `payment_intent.succeeded`, backend creates a finalized Invoice and marks it **paid** (`paid_out_of_band`). Abandoned open credit invoices are voided.
- **Subscriptions** — [Stripe Billing](https://docs.stripe.com/billing/subscriptions/overview) (`subscriptions.create` → recurring invoices). Incomplete checkout subscriptions are canceled with their open first invoice voided; in-app history shows **paid** invoices only.

With `collection_method: charge_automatically`, Stripe **does not email** the customer unless the toggles below are on. The API cannot replace these Dashboard settings.

JOBBIE sets `receipt_email` on credit PaymentIntents and subscription checkout PaymentIntents (`/platba`). For subscription invoice-backed payments, Stripe’s receipt email [includes a link to the hosted invoice](https://docs.stripe.com/receipts). Credit packs get the paid faktúra PDF via Dashboard **Successful payments** (section 1) after post-payment invoice creation. Enable both receipt and invoice-summary toggles for best coverage.

---

## 1. Paid invoice email (PDF + links) — required

**Settings → Emails** → scroll to **Email customers about** (this is **not** the **Payments** block above it).

| Toggle | Purpose |
|--------|---------|
| **Successful payments** (under *Email customers about*) | After an invoice is **paid**, Stripe emails the customer an **invoice summary** with links to the **invoice PDF** and hosted invoice page. |

Sandbox: [test emails](https://dashboard.stripe.com/acct_1TA4bmEXgv7DHN4D/test/settings/emails)  
Live: same page with **Live** mode in the header.

The **Payments → Successful payments** toggle (higher on the page) is only a **card payment receipt**. It does **not** include the full invoice. You can leave it off if you only want faktúry.

---

## 2. Finalized invoice email (subscriptions / invoicing) — recommended

**Settings → Billing → [Subscriptions and emails](https://dashboard.stripe.com/settings/billing/automatic)**

Under **Manage invoices sent to customers**, enable:

- **Send finalized invoices and credit notes to customers**

This sends Stripe’s invoice email when an invoice is finalized (subscription cycles and invoicing). Combine with section 1 for paid-invoice / receipt-style follow-ups where applicable.

---

## 3. Branding & invoice PDF content

| Setting | URL |
|---------|-----|
| Branding (logo, colors on PDF/emails) | [settings/branding](https://dashboard.stripe.com/settings/branding) |
| Public details (company name, support email) | [settings/public](https://dashboard.stripe.com/settings/public) |
| Invoice template (footer, memo, numbering) | [settings/billing/invoice](https://dashboard.stripe.com/settings/billing/invoice) |

Ensure the Stripe Customer has an **email** (JOBBIE sets this in `ensureStripeCustomer` at checkout).

---

## 4. Test mode

- Test mode may not send every email automatically; use **Send test receipt** on the Emails page or pay a test invoice and check [Invoices](https://dashboard.stripe.com/test/invoices).
- In Dashboard, open a **paid** invoice → **Invoice PDF** / hosted page to verify PDF generation before relying on email.
- JOBBIE sets the Stripe Customer `email` at checkout and `receipt_email` on the invoice’s PaymentIntent before you pay — check the paid invoice in Dashboard → **Receipt** / **Email history** if nothing arrives in the inbox (spam folder, wrong Stripe mode test vs live).

## Troubleshooting (no email)

1. **Correct Stripe mode** — test payments use test Dashboard email settings; live payments use live settings.
2. **Customer email** — Dashboard → Customers → your customer must show the same email as the JOBBIE account. JOBBIE syncs auth email at checkout and after payment.
3. **Wrong toggle** — enable **Email customers about → Successful payments**, not only **Payments → Successful payments** (card receipt without invoice PDF).
4. **Finalized invoice (optional)** — Billing → Subscriptions and emails → **Send finalized invoices** (email when invoice is finalized, before or after pay depending on flow).
5. **New payment after code/deploy** — old invoices are not re-emailed; run a new `/platba` test payment.

---

## In-app copy of invoices

Customers open past invoices in-app under **Nastavenia → Fakturácia** → **Zobraziť faktúru** (`GET /api/payments/invoices/:id`). The official PDF remains on Stripe (`invoice_pdf` download on the detail page). Hosted `invoice.stripe.com` links are no longer the primary UX.

---

## API limitations

- There is **no** Stripe API to turn on “email paid invoices” (Dashboard only).
- `invoices.sendInvoice` is for **`send_invoice`** collection (unpaid / payment instructions), not for replacing paid-invoice emails on `/platba` card checkout.
- `receipt_email` on invoice-backed PaymentIntents sends a receipt with a **hosted invoice link** (JOBBIE sets this at checkout). Dashboard **Successful payments** (section 1) adds Stripe’s invoice-summary email with PDF links — use both.

See also [payments-credits.md](./payments-credits.md) (checkout flows) and [stripe-invoice-sk-vat.md](./stripe-invoice-sk-vat.md) (§ 74 invoice mandatory fields).

---

## 5. Webhooks (subscriptions + invoicing)

Register these on your Stripe webhook endpoint (test **and** live). See [Subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) and [Invoicing](https://docs.stripe.com/invoicing).

| Event | Purpose |
|-------|---------|
| `invoice.paid` | Grant monthly subscription credits (`subscription_create` / `subscription_cycle`) |
| `invoice.payment_failed` | Mark `user_subscriptions.status` → `past_due`; in-app notification |
| `invoice.payment_action_required` | In-app notification (3DS / SCA on renewal) |
| `customer.subscription.created` / `updated` / `deleted` | Sync `user_subscriptions` |
| `payment_intent.succeeded` | Credit pack fulfillment (one-off invoices on `/platba`) |

Full list: [`backend-ts/.env.example`](../backend-ts/.env.example).

Paid-invoice **email** delivery is still controlled only by Dashboard toggles (sections 1–2), not webhooks. For reminders on unpaid invoices, see [Send email reminders](https://docs.stripe.com/invoicing/send-email) (`send_invoice` collection — not used on `/platba` card checkout).
