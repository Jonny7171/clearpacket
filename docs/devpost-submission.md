# ClearPacket Devpost submission

## Tagline

Compare the purchase order, invoice, and receipt before approving payment.

## What it does

ClearPacket puts a purchase order, supplier invoice, and delivery receipt into one review. Nutrient DWS extracts each file. The app compares the supplier, PO reference, quantities, unit prices, and totals.

If the values agree, there is nothing to review. If they do not, the app shows the conflicting numbers and asks the reviewer what should be paid. The decision is included in the audit record, then Doctavian generates the supplier credit acknowledgement.

The demo packet contains a subtle but costly error. The invoice bills 12 protective sleeves while the PO and delivery receipt show 10. ClearPacket catches the two-unit variance and its $18.40 impact without asking a reviewer to compare three PDFs by hand.

## How I built it

The app uses Nutrient Document Web Services through the Processor API. Each PDF is sent to the JSON content extraction pipeline with plain text, structured text, key-value pair, and table extraction enabled.

The server normalizes the extracted evidence and compares it with TypeScript rules. Extraction and comparison are separate on purpose. The document service reads the files, but code decides whether two quantities match and calculates the dollar difference. The interface records the reviewer’s choice with the source filenames, extracted values, checks, engine, and timestamp. Nutrient DWS then converts that record to PDF.

After the reviewer records a decision, the server derives the payable quantity and credit from the verified values. It uploads a DOCX template and structured packet data to Doctavian, calls the document generation API, and downloads the finished PDF. The template uses a repeater for line adjustments, a sum expression for the total credit, and a conditional paragraph that appears only when a credit is due.

The product is built with React, TypeScript, and server-side API routes. Source PDFs and API credentials never enter client-side storage.

## Problems I ran into

Extracting a document is not the same as checking it. The text can be read correctly while the relationship between three files is still wrong. I kept the raw extraction separate from the comparison so each result can be traced to a source value.

I also wanted the public page to remain usable without pretending a local fallback was a live API result. The supplied packet can show a clearly labelled demo result when no key is configured. Uploaded documents require Nutrient DWS, and the page states which engine produced the result.

## What is working

- The reviewer sees the conflicting values without comparing three PDFs by hand.
- The $18.40 overage is independently calculated from the quantity variance and unit price.
- Every human decision can be exported with the source filenames and verification evidence.
- Nutrient DWS handles both source-document extraction and the final audit PDF.
- Doctavian turns the recorded decision into a supplier-ready credit acknowledgement PDF.
- The Doctavian template includes a repeater, calculated credit total, and conditional credit language.
- The app is usable on desktop and mobile and includes a complete fictional document packet.

## What I learned

The useful split is straightforward: let Nutrient read the files, let code handle the arithmetic, leave the payment decision with a person, and let Doctavian produce the document the supplier can act on.

## What is next

- Tolerance policies by supplier and item category
- Duplicate invoice detection across packets
- Approval routing based on dollar impact
- ERP export after review
- Supplier response tracking for generated acknowledgements

## Submission fields to complete

- Public app URL: https://clearpacket.hdjskndf.chatgpt.site
- Public source repository: https://github.com/Jonny7171/clearpacket
- Project image: `output/devpost/clearpacket-cover.jpg`
- Image gallery: `output/devpost/clearpacket-demo-overview.jpg` and `output/devpost/clearpacket-human-review.jpg`
- Demo video: https://youtu.be/Rddunuh6of4
- Sponsor challenges: Nutrient DWS Challenge and Doctavian Challenge
- Team: solo
