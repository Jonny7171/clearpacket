import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDoctavianData } from '../scripts/lib/doctavian-packet.mjs';

test('derives the supplier credit from verified quantities', () => {
  const packet = buildDoctavianData({
    action: 'use-received',
    invoiceQuantity: 12,
    receivedQuantity: 10,
    unitPrice: 9.2,
  }).data.Packet[0];

  assert.equal(packet.PayableQuantity, 10);
  assert.equal(packet.AdjustmentAmount, 18.4);
  assert.equal(packet.Adjustments[0].AdjustmentAmount, 18.4);
});

test('records no credit when the reviewer approves the invoice quantity', () => {
  const packet = buildDoctavianData({
    action: 'approve-invoice',
    invoiceQuantity: 12,
    receivedQuantity: 10,
    unitPrice: 9.2,
  }).data.Packet[0];

  assert.equal(packet.PayableQuantity, 12);
  assert.equal(packet.AdjustmentAmount, 0);
  assert.deepEqual(packet.Adjustments, []);
});

test('ignores untrusted free-form amounts', () => {
  const packet = buildDoctavianData({
    action: 'use-received',
    invoiceQuantity: 12,
    receivedQuantity: 10,
    unitPrice: 9.2,
    adjustmentAmount: 500,
  }).data.Packet[0];

  assert.equal(packet.AdjustmentAmount, 18.4);
});

