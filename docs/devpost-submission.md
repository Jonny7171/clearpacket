# ClearPacket Devpost submission draft

## Tagline

Catch invoice mismatches before money moves.

## What it does

ClearPacket verifies a purchase order, supplier invoice, and delivery receipt as one evidence packet. Nutrient DWS extracts the document content. ClearPacket then applies deterministic checks to supplier identity, PO references, line quantities, unit prices, and totals.

When the documents agree, the result is automatic. When they do not, ClearPacket shows the exact source evidence and asks a person for one concrete decision. That decision becomes part of an exportable audit record.

The demo packet contains a subtle but costly error. The invoice bills 12 protective sleeves while the PO and delivery receipt show 10. ClearPacket catches the two-unit variance and its $18.40 impact without asking a reviewer to compare three PDFs by hand.

## How we built it

The app uses Nutrient Document Web Services through the Processor API. Each PDF is sent to the JSON content extraction pipeline with plain text, structured text, key-value pair, and table extraction enabled.

The server normalizes the extracted evidence and runs deterministic matching rules. The matching layer is intentionally separate from extraction. A language model is not allowed to invent a pass, a failure, or a dollar amount. The interface then routes only exceptions to a reviewer and records the final choice with the extraction engine, source document names, checks, values, and timestamp. Nutrient DWS converts that audit record into a polished PDF.

The product is built with React, TypeScript, and a server-side API route. Source PDFs and the Nutrient API key never enter client-side storage.

## Challenges we ran into

Document extraction is not the same as document verification. Extracted text can be correct while the relationship between three documents is still wrong. We designed the data flow so every verdict can be traced back to an extracted field and a deterministic comparison.

We also had to keep the demo useful without pretending a local fallback was Nutrient. The included sample packet can show a clearly labeled demo result when no key is configured. Uploaded documents require the real Nutrient DWS pipeline, and the interface identifies which engine produced the result.

## Accomplishments we are proud of

- The reviewer sees only the exception, not another dashboard full of extracted fields.
- The $18.40 overage is independently calculated from the quantity variance and unit price.
- Every human decision can be exported with the source filenames and verification evidence.
- Nutrient DWS handles both source-document extraction and the final audit PDF.
- The app is usable on desktop and mobile and includes a complete fictional document packet.

## What we learned

The strongest document workflow is not purely automatic. Automation should handle deterministic comparisons and focus human attention where judgment is actually required. That makes the result faster, safer, and easier to audit.

## What is next

- Tolerance policies by supplier and item category
- Duplicate invoice detection across packets
- Approval routing based on dollar impact
- ERP export after review
- Signed approval certificates for completed audit packets

## Submission fields to complete

- Public app URL: pending public deployment approval
- Public source repository: pending repository approval
- Demo video: use the 60-second script in `docs/demo-video-script.md`
- Sponsor challenge: Nutrient DWS Challenge
- Team: solo
