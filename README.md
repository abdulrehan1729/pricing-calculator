# Multi-Rate Pricing Calculator

A full-stack web application for creating pricing documents (invoices/quotes) with per-line discounts and tax, computing totals server-side, and reporting on a date range.

Built as a take-home assignment for CrossVal's Backend/Full Stack Developer role.

**Live URL:** Not deployed.

---

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (Mongoose)
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Auth:** JWT (email + password, bcrypt-hashed)
- **Validation:** Zod
- **Testing:** Jest (calculation module)

The stack was chosen to align with the role's core requirements (Node.js/TypeScript backend, MongoDB schema/index design, a shared Next.js/TypeScript codebase across frontend and backend).

---

## Prerequisites

- [Node.js](https://nodejs.org/) **20.9.0 or later** (includes npm). This is required by the Next.js frontend.
- [MongoDB Community Edition](https://www.mongodb.com/try/download/community) running locally, **or** a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection string.

For local development, the default database URI is:

```text
mongodb://127.0.0.1:27017/pricing_calculator
```

Start your local MongoDB service before starting the backend. The database is created automatically on first use.

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd multi-rate-pricing-calculator
```

### 2. Backend

```bash
cd backend
npm install
```

Create the backend environment file from the provided template:

```bash
cp .env.example .env
```

For a local MongoDB instance, keep the default values:

```dotenv
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/pricing_calculator
JWT_SECRET=replace-with-a-long-random-secret
SALT_ROUND=12
```

To use MongoDB Atlas instead, replace only `MONGO_URI` with your Atlas connection string. Do not commit `.env` files or credentials.

Run tests (calculation module):

```bash
npm test
```

Start the dev server:

```bash
npm run dev
```

The API runs at `http://localhost:4000`. Health check: `GET /health`.

### 3. Frontend

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`. It redirects to `/login`, which contains both sign-up and log-in (toggle link at the bottom of the form — there's no separate `/signup` route).

### 4. Verify the project

In separate terminals, run the backend and frontend checks:

```bash
cd backend && npm run build && npm test
cd frontend && npm run lint
```

---

## Calculation & Rounding Policy

All calculations happen **only** on the server, inside a single pure module (`backend/src/calculations/pricing.ts`) with no database or HTTP dependencies. This module is the sole source of truth for every total in the system — the same functions are used whether a document has one line item or fifty.

### Per-line calculation (in order)

1. **Subtotal** = quantity × unit price
2. **Discount** — a line has *either* a percent discount *or* a fixed-amount discount, never both:
   - Percent: `subtotal × (discountValue / 100)`
   - Fixed: `min(discountValue, subtotal)`
3. **After-discount amount** = subtotal − discount amount
4. **Tax** = after-discount amount × (taxPercent / 100) — **tax is applied on the discounted amount, not the original subtotal**
5. **Line total** = after-discount amount + tax amount

### Rounding

Every intermediate value (subtotal, discount amount, after-discount amount, tax amount, line total, and each accumulation step in the document-level sum) is rounded to **2 decimal places** using a helper that adds `Number.EPSILON` before rounding, to avoid common floating-point artifacts (e.g. `9.000000000000002` instead of `9`).

Rounding at every step, rather than only at the very end, keeps every number the user sees — per line and in the document totals — internally consistent and traceable back to a value that was actually rounded and displayed somewhere.

### Worked example (matches the assignment's sample document)

| Line | Qty | Unit Price | Discount | Tax | Subtotal | Discount Amt | After Discount | Tax Amt | Line Total |
|---|---|---|---|---|---|---|---|---|---|
| Widget A | 2 | $100.00 | 10% | 5% | $200.00 | $20.00 | $180.00 | $9.00 | $189.00 |
| Widget B | 1 | $50.00 | — | 5% | $50.00 | $0.00 | $50.00 | $2.50 | $52.50 |
| Service fee | 1 | $200.00 | $20 fixed | — | $200.00 | $20.00 | $180.00 | $0.00 | $180.00 |

**Document totals:**
- Subtotal: $450.00
- Total discount: $40.00
- Total tax: $11.50
- **Grand total: $421.50**

This exact scenario is covered by a unit test (`backend/src/calculations/__tests__/pricing.test.ts`) asserting all four document-level totals.

### Fixed discount exceeding subtotal

**Decision: cap at the subtotal.** A fixed discount cannot reduce a line below zero, so a discount larger than the line subtotal is capped at that subtotal. The API stores the submitted discount value, but the calculated discount amount and all totals use the capped value.

---

## Document Lifecycle & Immutability

Documents have two states: `draft` and `finalized`.

- **`draft`** — fully editable: line items can be added, edited, or removed; title, customer, and issue date can be changed.
- **`finalized`** — fully immutable. Any attempt to edit lines, metadata, or delete the document is rejected by the API with `409 Conflict` and a clear message.

This is enforced centrally in the service layer (`assertEditable`), called at the start of every mutating operation, rather than being checked ad hoc in individual routes — so there's no code path where a finalized document can be silently modified.

**Finalize-time validation (stretch goal implemented):** finalizing is rejected if the document has zero line items, or if any line has quantity ≤ 0 or a negative unit price.

**Assumption beyond the spec's literal wording:** a finalized document also cannot be *deleted*. The spec only mentions "no edits to lines, amounts, or metadata," but since finalization is meant to represent an immutable record (the same reasoning that makes an invoice not editable after being sent), deletion is treated as another way of destroying that immutability and is blocked the same way.

**Duplicate finalized → draft (stretch goal):** not implemented in this submission due to time constraints. See "What I'd improve" below.

---

## API Overview

All endpoints except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

```
POST   /auth/signup
POST   /auth/login

POST   /documents
GET    /documents
GET    /documents/:id
PATCH  /documents/:id            (draft only)
DELETE /documents/:id            (draft only)

POST   /documents/:id/lines               (draft only)
PATCH  /documents/:id/lines/:lineId       (draft only)
DELETE /documents/:id/lines/:lineId       (draft only)

PATCH  /documents/:id/finalize

GET    /reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
```

Errors return a consistent shape:

```json
{ "error": "Validation failed", "details": [{ "field": "quantity", "message": "Quantity must be >= 1" }] }
```

---

## Data Modeling Note

Line items are **embedded** inside their parent document, rather than stored in a separate MongoDB collection. This was a deliberate schema decision: line items have no independent existence outside their document, are always read and written together with it, and this shape avoids N+1 queries and gives atomic single-document writes when totals are recalculated. A compound index on `{ userId: 1, issueDate: 1 }` supports both the document list and the date-range report, since every real query in the app filters by both fields together.

---

## Assumptions & Tradeoffs

- **Money as plain decimal numbers**, not integer cents. Floating-point drift is mitigated by rounding to 2 decimals at every calculation step (see Rounding Policy above) rather than only at the end.
- **Auth token stored in `localStorage`** on the frontend for simplicity. A production app would use httpOnly cookies to reduce XSS exposure — noted here as a known tradeoff, not an oversight.
- **Frontend and backend types are hand-duplicated** (`frontend/src/types/document.ts` mirrors the backend's Mongoose interfaces) rather than shared via a monorepo package, to avoid extra tooling overhead at this scope.
- **Client-side auth guard is UX-only.** The real security boundary is the backend's `requireAuth` middleware and per-query `userId` scoping; the frontend's redirect-if-no-token check just avoids flashing protected UI, and is not itself a security control.
- **Cross-user access returns `404`, not `403`,** when a user requests a document they don't own — this avoids confirming to an unauthorized caller that a given document ID even exists.

## What I'd Improve Before Production

- Implement the duplicate-finalized-into-draft stretch goal
- **Backend cold starts:** the API is deployed on Render's free tier, which spins down after periods of inactivity. The first request after idle time may take 30–60 seconds to respond while the instance wakes up — subsequent requests are fast.
- Share types between frontend and backend via a workspace package instead of hand-syncing two files
- Move the auth token to an httpOnly cookie
- Add integration tests for the API routes (currently only the calculation module has unit tests, per the assignment's guidance that it's the highest-value test surface — but route-level and lifecycle tests would add further confidence)
- Add pagination to the document list endpoint for accounts with many documents
- Send the existing structured JSON logs to a centralized observability service for production monitoring
