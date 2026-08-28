# ClearPacket

ClearPacket is a three-way document verification desk. It extracts a purchase order, supplier invoice, and delivery receipt, compares them with deterministic rules, sends uncertain items to a person, and exports the full audit trail.

Built for the Nutrient DWS Challenge at the DevNetwork API + Cloud + AI Hackathon 2026.

## Why it exists

Accounts payable teams should not have to scan three documents line by line to catch a small overbill. ClearPacket lets document extraction handle the reading, deterministic rules handle the comparison, and a person handle only the exception.

The included fictional packet contains one deliberate mismatch: the supplier invoice bills 12 protective sleeves while the purchase order and delivery receipt both show 10. ClearPacket identifies the quantity variance and the resulting $18.40 overage.

## Run locally

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and add a Nutrient DWS API key.
3. Start the app with `pnpm dev`.
4. Open `http://localhost:3000`.

Without an API key, the exact included demo packet uses a clearly labeled local demo result. Any uploaded documents require Nutrient DWS.

## Verification flow

1. Upload or open the three source PDFs.
2. Nutrient DWS extracts plain text, structured text, key-value pairs, and tables.
3. ClearPacket checks supplier identity, PO reference, line quantities, and invoice total.
4. A reviewer chooses the payable quantity for the exception.
5. ClearPacket exports the evidence, verification result, extraction engine, and human decision as an audit record.

## Privacy

Uploaded PDFs are processed in memory for the current verification request. ClearPacket does not persist source documents or API keys.
