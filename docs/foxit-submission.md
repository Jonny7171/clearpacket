# ClearPacket for the Foxit challenge

## One-line pitch

ClearPacket turns a reviewed invoice exception into a signable supplier resolution without letting the agent invent the amount or sign for a person.

## Why the boundary matters

The agent is allowed to create, convert, and prepare a resolution packet because those actions are reversible. It cannot make the payable-quantity decision, change the verified quantities, or sign the acknowledgement.

The human decision is recorded before document generation. ClearPacket then derives the credit from the verified quantity difference and unit price. Reviewer instructions are treated as context, not authority to change those values.

Foxit's official MCP server performs the reversible work through `upload_document`, `pdf_from_html`, and `download_document`. Foxit eSign is called directly only after the PDF is ready. The API creates an embedded signing session with `sendNow: false`, so the supplier signs in a human-controlled session and no invitation email is sent by the demo.

## End-to-end demo

1. Run the included three-document packet.
2. Open the quantity exception and choose the payable quantity.
3. Record the decision.
4. Pass a plain-language resolution instruction to the Foxit agent.
5. Show the three MCP calls and the generated signable PDF.
6. Show the direct Foxit eSign response and open the embedded session.
7. Have the supplier complete the signature.
8. Show that the signed result preserves the verified $18.40 credit and the original audit packet ID.

## Foxit does the real work

Foxit PDF Services turns the reviewed exception into the signable PDF through the official MCP server. Foxit eSign creates the human signing session directly and applies the final signature only after the person acts.
