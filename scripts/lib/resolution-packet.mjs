const MONEY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export const DEMO_RESOLUTION = Object.freeze({
  packetId: 'CP-1048',
  supplier: 'Prairie Safety Supply',
  buyer: 'Northwind Finance',
  invoiceId: 'INV-7782',
  purchaseOrderId: 'PO-1048',
  sku: 'PS-092',
  description: 'Heat-resistant protective sleeves',
  orderedQuantity: 10,
  invoicedQuantity: 12,
  receivedQuantity: 10,
  unitPrice: 9.2,
  decision: 'Pay for 10 received units',
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }
  return number;
}

export function buildResolutionPacket(input = {}) {
  const source = { ...DEMO_RESOLUTION, ...input };
  const orderedQuantity = finiteNumber(source.orderedQuantity, 'orderedQuantity');
  const invoicedQuantity = finiteNumber(source.invoicedQuantity, 'invoicedQuantity');
  const receivedQuantity = finiteNumber(source.receivedQuantity, 'receivedQuantity');
  const unitPrice = finiteNumber(source.unitPrice, 'unitPrice');
  const overbilledQuantity = Math.max(0, invoicedQuantity - receivedQuantity);
  const creditAmount = Number((overbilledQuantity * unitPrice).toFixed(2));

  return {
    packetId: String(source.packetId || '').trim(),
    supplier: String(source.supplier || '').trim(),
    buyer: String(source.buyer || '').trim(),
    invoiceId: String(source.invoiceId || '').trim(),
    purchaseOrderId: String(source.purchaseOrderId || '').trim(),
    sku: String(source.sku || '').trim(),
    description: String(source.description || '').trim(),
    orderedQuantity,
    invoicedQuantity,
    receivedQuantity,
    unitPrice,
    overbilledQuantity,
    creditAmount,
    decision: String(source.decision || '').trim(),
    instruction: String(source.instruction || 'Prepare a supplier credit acknowledgement for the reviewed exception.').trim(),
    generatedAt: String(source.generatedAt || new Date().toISOString()),
  };
}

export function buildResolutionHtml(input = {}) {
  const packet = buildResolutionPacket(input);
  if (!packet.packetId || !packet.supplier || !packet.buyer || !packet.invoiceId) {
    throw new Error('Packet, supplier, buyer, and invoice identifiers are required.');
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      @page { size: Letter; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #17221c; background: #f5f3eb; font-family: Arial, Helvetica, sans-serif; }
      main { min-height: 11in; padding: 0.62in; }
      .top { display: flex; justify-content: space-between; padding-bottom: 18px; border-bottom: 2px solid #17221c; }
      .brand { font-size: 20px; font-weight: 800; }
      .packet { font: 700 10px monospace; }
      h1 { max-width: 560px; margin: 38px 0 8px; font-size: 40px; line-height: 0.98; letter-spacing: -1.8px; }
      .sub { margin: 0 0 30px; color: #667169; font-size: 12px; }
      .callout { margin: 24px 0; padding: 18px; border-radius: 13px; background: #f3ad82; }
      .callout span, h2, dt { color: #58645c; font-size: 9px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; }
      .callout strong { display: block; margin-top: 7px; font-size: 28px; }
      dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin: 0; border: 1px solid #17221c; background: #17221c; }
      dl div { padding: 14px; background: #f5f3eb; }
      dd { margin: 6px 0 0; font-size: 13px; font-weight: 700; }
      .decision { margin-top: 24px; padding: 18px; border: 1px solid #17221c; border-radius: 13px; background: #d7ff52; }
      .decision p { margin: 7px 0 0; font-size: 11px; line-height: 1.55; }
      .instruction { margin-top: 22px; padding: 15px 17px; border-left: 4px solid #17221c; color: #4e5b53; font-size: 11px; line-height: 1.55; }
      .signature { margin-top: 48px; padding-top: 18px; border-top: 1px solid #17221c; }
      .signature-grid { display: grid; grid-template-columns: 1fr 180px; gap: 30px; margin-top: 24px; }
      .signature-line { min-height: 54px; border-bottom: 1px solid #17221c; }
      .tag { color: #f5f3eb; font-size: 7px; }
      .label { display: block; margin-top: 6px; color: #667169; font-size: 9px; }
      .foot { margin-top: 40px; padding-top: 14px; border-top: 1px solid rgba(23,34,28,0.2); color: #667169; font-size: 8px; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <div class="top"><div class="brand">ClearPacket</div><div class="packet">${escapeHtml(packet.packetId)}</div></div>
      <h1>Supplier credit acknowledgement</h1>
      <p class="sub">Generated only after the invoice exception was verified and a person recorded the payable quantity.</p>

      <section class="callout">
        <span>Credit requested</span>
        <strong>${escapeHtml(MONEY.format(packet.creditAmount))}</strong>
      </section>

      <dl>
        <div><dt>Supplier</dt><dd>${escapeHtml(packet.supplier)}</dd></div>
        <div><dt>Buyer</dt><dd>${escapeHtml(packet.buyer)}</dd></div>
        <div><dt>Invoice</dt><dd>${escapeHtml(packet.invoiceId)}</dd></div>
        <div><dt>Purchase order</dt><dd>${escapeHtml(packet.purchaseOrderId)}</dd></div>
        <div><dt>Item</dt><dd>${escapeHtml(packet.sku)}: ${escapeHtml(packet.description)}</dd></div>
        <div><dt>Unit price</dt><dd>${escapeHtml(MONEY.format(packet.unitPrice))}</dd></div>
        <div><dt>Ordered and received</dt><dd>${escapeHtml(packet.receivedQuantity)} units</dd></div>
        <div><dt>Invoiced</dt><dd>${escapeHtml(packet.invoicedQuantity)} units</dd></div>
      </dl>

      <section class="decision">
        <h2>Recorded human decision</h2>
        <p><strong>${escapeHtml(packet.decision)}</strong></p>
        <p>The credit is calculated from ${escapeHtml(packet.overbilledQuantity)} excess units at ${escapeHtml(MONEY.format(packet.unitPrice))} each. The instruction cannot override these verified quantities or the calculated amount.</p>
      </section>

      <p class="instruction"><strong>Reviewer instruction:</strong> ${escapeHtml(packet.instruction)}</p>

      <section class="signature">
        <h2>Supplier acknowledgement</h2>
        <div class="signature-grid">
          <div><div class="signature-line"><span class="tag">\${signfield:1:y:Supplier_Signature:________________}</span></div><span class="label">Authorized supplier signature</span></div>
          <div><div class="signature-line"><span class="tag">\${datefield:1:y:Signed_Date:____________}</span></div><span class="label">Date signed</span></div>
        </div>
      </section>

      <p class="foot">Foxit PDF Services creates the signable PDF through the official MCP server. Foxit eSign creates the human signing session directly. ClearPacket never signs for the supplier.</p>
    </main>
  </body>
</html>`;
}
