# ClearPacket 2 minute 30 second demo script

## 0:00 to 0:18

Show the full workspace and the three source PDFs.

Voiceover: "Accounts payable usually gets a purchase order, an invoice, and a delivery receipt. The numbers should agree, but checking every line by hand is slow. ClearPacket puts the three documents in one review before any money moves."

## 0:18 to 0:42

Open the purchase order, invoice, and receipt in turn. Point to PO-1048, item PS-092, and the quantities.

Voiceover: "This is a fictional packet from Apex Industrial Supply. The order requests 10 protective sleeves. The invoice bills 12. The receipt confirms that 10 arrived. Each source stays available so the reviewer can check the evidence directly."

## 0:42 to 1:04

Return to ClearPacket and select Run verification. Leave the processing state visible, then show the Nutrient DWS engine badge.

Voiceover: "When I run verification, the PDFs go to the Nutrient DWS Processor API. DWS extracts plain text, structured text, key-value pairs, and tables. ClearPacket then applies deterministic matching rules to those extracted values."

## 1:04 to 1:28

Point to each comparison row and the $18.40 difference.

Voiceover: "Supplier identity, purchase order reference, and unit price agree. Quantity does not. The invoice has two extra units at $9.20 each, so the amount at issue is $18.40. ClearPacket does not guess what to pay. It sends that decision to a person."

## 1:28 to 1:52

Open the review panel. Pause on 10 ordered, 12 billed, and 10 received. Choose Pay for 10 received units.

Voiceover: "The reviewer sees the three quantities together and chooses the payable amount. Here I am paying for the 10 units that were actually received. The alternative remains available if there is a valid reason to accept the invoice variance."

## 1:52 to 2:12

Record the decision and show the resolved packet.

Voiceover: "The decision closes the exception without hiding it. ClearPacket keeps the source filenames, extracted values, checks, selected action, and timestamp attached to packet CP-1048."

## 2:12 to 2:30

Select Export audit. Open the generated PDF and end on its evidence and decision sections.

Voiceover: "Nutrient DWS converts that record into the final audit PDF. The result is a review another person can follow later: what the documents said, what failed, and who decided what to pay."

## Recording notes

- Record one continuous 1920 by 1080 take.
- Keep browser zoom at 100 percent.
- Do not speed up the DWS processing state.
- Show the Nutrient DWS engine badge after the live API run.
- Open the generated audit PDF before ending.
- Do not record the local demo fallback for the final submission.
