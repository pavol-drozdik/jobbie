# Stripe and app invoice emails (faktúry)

Paid **faktúry** (invoice PDF) are delivered primarily by **JOBBIE Nest SMTP** (`BillingInvoiceEmailService`) after a Stripe invoice is **paid** — credit packs and subscription invoices (`subscription_create` / `subscription_cycle`). Requires `SMTP_HOST`, `SMTP_FROM`, and Stripe configured; optional `BILLING_INVOICE_EMAIL_ENABLED=false` to disable. See [email-smtp.md](./email-smtp.md).

Stripe may still send a separate **card payment receipt** (`receipt_email` on PaymentIntent). That is not the faktúra PDF.

Checkout creates Stripe `Invoice` objects:

- **Credits** — standalone PaymentIntent on `/platba`; after `payment_intent.succeeded`, backend creates a finalized Invoice and marks it **paid** (`attachPayment` / `paid_out_of_band`), then emails the PDF via SMTP.
- **Subscriptions** — [Stripe Billing](https://docs.stripe.com/billing/subscriptions/overview) (`subscriptions.create` → recurring invoices). `invoice.paid` webhook emails the faktúra via SMTP.

Idempotency: `billing_invoice_email_dispatches` (one email per `stripe_invoice_id`).

---

## Optional: Stripe Dashboard emails (supplementary)

You can still enable Stripe’s own customer emails. They are **not required** when app SMTP is configured.

**Settings → Business → Customer emails** (or [settings/emails](https://dashboard.stripe.com/settings/emails)):

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

### Receipts arrive but invoice PDF / faktúra email does not

This is the most common misconfiguration: Stripe’s **Payments** block and **Email customers about** block each have a **Successful payments** toggle — they send **different** emails.

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Card receipt in inbox, no invoice PDF | **Payments → Successful payments** is on; **Email customers about → Successful payments** is off | Enable section 1 toggle (test **and** live) |
| Nothing at all | Customer has no email on Stripe Customer | Re-pay after checkout; check Dashboard → Customers |
| Invoice exists in Dashboard, no email | Wrong Stripe mode (test vs live) email settings | Match mode to the payment you made |

The card receipt (`receipt_email` on PaymentIntent) does **not** replace the paid-invoice email with PDF attachment. Enable **Email customers about → Successful payments** for faktúry.

### General checklist

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

- `invoices.sendInvoice` only works for `send_invoice` collection (unpaid invoices) — JOBBIE does **not** use this for `/platba` card checkout.
- App faktúra email: `BillingInvoiceEmailService.sendPaidInvoiceEmailIfNeeded` after paid invoice exists.

See also [payments-credits.md](./payments-credits.md) and [stripe-invoice-sk-vat.md](./stripe-invoice-sk-vat.md).

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

Paid-invoice **email** delivery is primarily app SMTP (see top of this doc). Webhooks below handle credits and subscription sync.

For reminders on unpaid invoices, see [Send email reminders](https://docs.stripe.com/invoicing/send-email) (`send_invoice` collection — not used on `/platba` card checkout).
