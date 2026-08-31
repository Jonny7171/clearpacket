# ClearPacket

I built ClearPacket to answer one narrow accounts payable question: does the invoice agree with what was ordered and received?

The app reads a purchase order, supplier invoice, and delivery receipt with Nutrient DWS. It compares the extracted values in code, shows the exact difference, and records the reviewer’s decision. Doctavian then turns that decision into a supplier credit acknowledgement.

Built for the Nutrient DWS, Doctavian, and Foxit Software challenges at the DevNetwork API + Cloud + AI Hackathon 2026.

**[Open the live demo](https://clearpacket.hdjskndf.chatgpt.site)**

**[Watch the 50-second walkthrough](https://youtu.be/Rddunuh6of4)**

The hosted demo uses the real Nutrient DWS Processor API for document extraction and audit PDF generation.

![ClearPacket verification workspace](output/devpost/clearpacket-cover.jpg)

## The demo

The fictional packet contains a small error that is easy to miss when the files are reviewed separately. The invoice lists 12 protective sleeves. The purchase order and receipt both list 10. At $9.20 each, the difference is $18.40.

The hosted demo calls the real Nutrient DWS Processor API for extraction and for the final audit PDF. If the API key or service credits are unavailable, only the supplied fictional packet can use the clearly labelled fallback result. Uploaded files never fall back to demo data.

## Run locally

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and add the server-side API credentials you want to test.
3. Start the app with `pnpm dev`.
4. Open `http://localhost:3000`.

Without an API key, the exact included demo packet uses a clearly labeled local demo result. Any uploaded documents require Nutrient DWS.

## What happens when you run it

1. Upload or open the three source PDFs.
2. Nutrient DWS extracts plain text, structured text, key-value pairs, and tables.
3. ClearPacket checks the supplier, PO reference, line quantities, unit price, and invoice total.
4. A reviewer chooses the payable quantity for the exception.
5. ClearPacket exports the evidence and human decision as an audit record.
6. Doctavian merges the verified values into a supplier-ready acknowledgement PDF.

## Doctavian acknowledgement

The Doctavian route does real document work after the human decision:

1. ClearPacket derives the payable quantity and credit from the verified invoice and receipt values.
2. It uploads a DOCX template and the structured packet data to Doctavian.
3. It calls Doctavian's document generation API to merge repeaters, calculations, and the conditional credit paragraph.
4. It downloads the generated PDF to the reviewer.

The app never accepts a typed credit amount. The $18.40 adjustment is recalculated on the server from 12 invoiced units, 10 received units, and the $9.20 unit price. The included template and sample data are in `assets/doctavian/`.

Doctavian's hackathon collection currently defaults to Microsoft OAuth. Set `DOCTAVIAN_AUTH_PROVIDER` only if the sponsor assigns a different provider to the account.

## Foxit resolution agent

After a person resolves an exception, the optional Foxit agent turns that decision into a supplier credit acknowledgement and creates an embedded human signing session.

The agent uses Foxit's official MCP server for the reversible document work:

1. `upload_document` uploads the generated HTML agreement.
2. `pdf_from_html` creates the signable PDF.
3. `download_document` retrieves the finished PDF.
4. The agent calls Foxit eSign directly to create an embedded signing session with `sendNow: false`.

ClearPacket never signs for a person and never emails the signer automatically. The signer receives a session URL and completes the signature themselves.

Run the safe local preview without credentials:

```bash
pnpm foxit:dry-run
```

For a live test, add the Foxit credentials from the free Developer account, then run:

```bash
pnpm exec node scripts/foxit-resolution-agent.mjs \
  --instruction "Prepare a supplier credit acknowledgement for the reviewed exception." \
  --signer-first "Supplier" \
  --signer-last "Reviewer" \
  --signer-email "signer@example.com"
```

The live run creates a draft embedded session. It does not send an invitation email.

## Demo packet

The repository includes three fictional PDFs in `public/demo/`:

- `PO-1048.pdf`
- `INV-7782.pdf`
- `RECEIPT-592.pdf`

Run the packet as supplied to reproduce the two-unit quantity variance and $18.40 invoice overage.

## Scope and privacy

Uploaded PDFs are processed in memory for the current verification request. ClearPacket does not persist source documents or API keys. Doctavian receives only the structured decision data needed to generate the acknowledgement.

This is a focused hackathon build, not a finished accounts payable platform. The current parser is tuned to the included packet structure. Production work would add supplier-specific field mappings, duplicate invoice checks, tolerance policies, and ERP export.
