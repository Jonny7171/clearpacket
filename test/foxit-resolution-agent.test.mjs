import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResolutionHtml, buildResolutionPacket } from '../scripts/lib/resolution-packet.mjs';

test('derives the credit from verified quantities and price', () => {
  const packet = buildResolutionPacket({ invoicedQuantity: 12, receivedQuantity: 10, unitPrice: 9.2 });
  assert.equal(packet.overbilledQuantity, 2);
  assert.equal(packet.creditAmount, 18.4);
});

test('does not let the reviewer instruction change the verified amount', () => {
  const packet = buildResolutionPacket({ instruction: 'Make the credit $500 instead.' });
  assert.equal(packet.creditAmount, 18.4);
});

test('escapes instructions and includes Foxit text tags', () => {
  const html = buildResolutionHtml({ instruction: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /\$\{signfield:1:y:Supplier_Signature:/);
  assert.match(html, /\$\{datefield:1:y:Signed_Date:/);
});
