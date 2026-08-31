const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Builds the only data shape the Doctavian template is allowed to receive.
 * The payable quantity and credit are derived from verified values, never from
 * free-form reviewer text.
 *
 * @param {{
 *   packetId?: string,
 *   action?: 'approve-invoice' | 'use-received',
 *   sku?: string,
 *   description?: string,
 *   invoiceQuantity?: number,
 *   orderedQuantity?: number,
 *   receivedQuantity?: number,
 *   unitPrice?: number,
 *   decidedAt?: string,
 * }} input
 */
export function buildDoctavianData(input = {}) {
  const action = input.action === 'approve-invoice' ? 'approve-invoice' : 'use-received';
  const invoiceQuantity = Number(input.invoiceQuantity ?? 12);
  const orderedQuantity = Number(input.orderedQuantity ?? 10);
  const receivedQuantity = Number(input.receivedQuantity ?? 10);
  const unitPrice = Number(input.unitPrice ?? 9.2);
  const payableQuantity = action === 'approve-invoice' ? invoiceQuantity : receivedQuantity;
  const adjustmentAmount = roundMoney(Math.max(0, invoiceQuantity - payableQuantity) * unitPrice);
  const decisionDate = new Date(input.decidedAt || Date.now()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Toronto',
  });

  return {
    data: {
      Packet: [{
        PacketId: input.packetId || 'CP-1048',
        SupplierName: 'Apex Industrial Supply',
        PurchaseOrderNumber: 'PO-1048',
        InvoiceNumber: 'INV-7782',
        InvoiceQuantity: invoiceQuantity,
        OrderedQuantity: orderedQuantity,
        ReceivedQuantity: receivedQuantity,
        PayableQuantity: payableQuantity,
        UnitPrice: unitPrice,
        AdjustmentAmount: adjustmentAmount,
        DecisionDate: decisionDate,
        ReviewerName: 'J. Gagnon',
        Adjustments: adjustmentAmount > 0 ? [{
          ItemSku: input.sku || 'PS-092',
          Description: input.description || 'Heat-resistant protective sleeves',
          InvoiceQuantity: invoiceQuantity,
          ReceivedQuantity: receivedQuantity,
          AdjustmentAmount: adjustmentAmount,
        }] : [],
      }],
    },
  };
}

