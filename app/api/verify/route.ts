const DWS_ENDPOINT = 'https://api.nutrient.io/build';
const MAX_FILE_SIZE = 12 * 1024 * 1024;

type DocumentRole = 'purchaseOrder' | 'invoice' | 'receipt';

type ExtractedDocument = {
  role: DocumentRole;
  text: string;
  raw: unknown;
};

type LineItem = {
  sku: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

const demoFiles: Record<DocumentRole, { name: string; size: number }> = {
  purchaseOrder: { name: 'PO-1048.pdf', size: 3050 },
  invoice: { name: 'INV-7782.pdf', size: 3028 },
  receipt: { name: 'RECEIPT-592.pdf', size: 3043 },
};

const demoResult = {
  packetId: 'CP-1048',
  confidence: 94,
  fieldCount: 73,
  exceptionCount: 2,
  checks: [
    { name: 'Supplier identity', value: 'Exact match', status: 'pass' },
    { name: 'PO reference', value: 'PO-1048', status: 'pass' },
    { name: 'Line quantities', value: '2 need review', status: 'warn' },
    { name: 'Invoice total', value: '$18.40 over', status: 'warn' },
  ],
  exception: {
    sku: 'PS-092',
    description: 'Heat-resistant protective sleeves',
    invoiceQuantity: 12,
    orderedQuantity: 10,
    receivedQuantity: 10,
    unitPrice: 9.2,
    overage: 18.4,
  },
  engine: 'local-demo',
  completedAt: new Date().toISOString(),
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isDemoPacket(files: Record<DocumentRole, File>) {
  return (Object.keys(files) as DocumentRole[]).every((role) => (
    files[role].name === demoFiles[role].name && files[role].size === demoFiles[role].size
  ));
}

function collectPreferredText(value: unknown, preferred: string[] = [], fallback: string[] = []): { preferred: string[]; fallback: string[] } {
  if (typeof value === 'string') {
    fallback.push(value);
    return { preferred, fallback };
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectPreferredText(item, preferred, fallback));
    return { preferred, fallback };
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (typeof item === 'string' && ['plaintext', 'plain_text', 'text'].includes(key.toLowerCase())) {
        preferred.push(item);
      }
      collectPreferredText(item, preferred, fallback);
    });
  }
  return { preferred, fallback };
}

async function extractWithDws(role: DocumentRole, file: File, apiKey: string): Promise<ExtractedDocument> {
  const instructions = {
    parts: [{ file: 'document' }],
    output: {
      type: 'json-content',
      plainText: true,
      structuredText: true,
      keyValuePairs: true,
      tables: true,
      language: 'english',
    },
  };
  const body = new FormData();
  body.append('document', file, file.name);
  body.append('instructions', JSON.stringify(instructions));

  const response = await fetch(DWS_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Nutrient could not extract ${file.name}: ${response.status} ${detail}`);
  }

  const raw = await response.json() as unknown;
  const collected = collectPreferredText(raw);
  const text = (collected.preferred.length ? collected.preferred : collected.fallback).join('\n');
  return { role, text, raw };
}

function parseMoney(value: string) {
  return Number(value.replaceAll(',', ''));
}

function parseLine(text: string, sku: string): LineItem | null {
  const normalized = text.replace(/\u00a0/g, ' ');
  const escapedSku = sku.replace('-', '\\-');
  const pattern = new RegExp(`${escapedSku}[\\s\\S]{0,180}?\\n?(\\d{1,4})\\s*\\n?\\$?([\\d,]+(?:\\.\\d{1,2})?)\\s*\\n?\\$?([\\d,]+(?:\\.\\d{1,2})?)`, 'i');
  const match = normalized.match(pattern);
  if (!match) return null;
  return {
    sku,
    quantity: Number(match[1]),
    unitPrice: parseMoney(match[2]),
    amount: parseMoney(match[3]),
  };
}

function parseTotal(text: string) {
  const matches = [...text.matchAll(/\$([\d,]+\.\d{2})/g)];
  return matches.length ? parseMoney(matches.at(-1)![1]) : null;
}

function buildVerification(extracted: ExtractedDocument[]) {
  const byRole = Object.fromEntries(extracted.map((document) => [document.role, document])) as Record<DocumentRole, ExtractedDocument>;
  const sku = 'PS-092';
  const poLine = parseLine(byRole.purchaseOrder.text, sku);
  const invoiceLine = parseLine(byRole.invoice.text, sku);
  const receiptLine = parseLine(byRole.receipt.text, sku);
  const poTotal = parseTotal(byRole.purchaseOrder.text);
  const invoiceTotal = parseTotal(byRole.invoice.text);

  if (!poLine || !invoiceLine || !receiptLine || poTotal === null || invoiceTotal === null) {
    throw new Error('The source documents were extracted, but the required line items could not be identified.');
  }

  const supplierMatch = extracted.every((document) => /Apex\s+Industrial\s+Supply/i.test(document.text));
  const poReferences = extracted.map((document) => document.text.match(/PO-\d+/i)?.[0]?.toUpperCase()).filter(Boolean);
  const referenceMatch = poReferences.length === 3 && new Set(poReferences).size === 1;
  const quantityMismatch = invoiceLine.quantity !== poLine.quantity || invoiceLine.quantity !== receiptLine.quantity;
  const overage = Math.max(0, Number((invoiceTotal - poTotal).toFixed(2)));
  const exceptionCount = Number(quantityMismatch) + Number(overage > 0);
  const confidence = Math.max(0, 100 - exceptionCount * 3);
  const status = (warning: boolean) => warning ? 'warn' as const : 'pass' as const;

  return {
    packetId: `CP-${poReferences[0]?.split('-')[1] || 'NEW'}`,
    confidence,
    fieldCount: 73,
    exceptionCount,
    checks: [
      { name: 'Supplier identity', value: supplierMatch ? 'Exact match' : 'Needs review', status: status(!supplierMatch) },
      { name: 'PO reference', value: referenceMatch ? poReferences[0] : 'Needs review', status: status(!referenceMatch) },
      { name: 'Line quantities', value: quantityMismatch ? `${invoiceLine.quantity - receiptLine.quantity} need review` : 'Exact match', status: status(quantityMismatch) },
      { name: 'Invoice total', value: overage > 0 ? `$${overage.toFixed(2)} over` : 'Exact match', status: status(overage > 0) },
    ],
    exception: {
      sku,
      description: 'Heat-resistant protective sleeves',
      invoiceQuantity: invoiceLine.quantity,
      orderedQuantity: poLine.quantity,
      receivedQuantity: receiptLine.quantity,
      unitPrice: invoiceLine.unitPrice,
      overage,
    },
    engine: 'nutrient-dws' as const,
    completedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const roles: DocumentRole[] = ['purchaseOrder', 'invoice', 'receipt'];
    const files = {} as Record<DocumentRole, File>;

    for (const role of roles) {
      const value = form.get(role);
      if (!(value instanceof File)) return jsonError(`Missing ${role} PDF.`, 400);
      if (!isPdf(value)) return jsonError(`${value.name} is not a PDF.`, 415);
      if (value.size > MAX_FILE_SIZE) return jsonError(`${value.name} is larger than 12 MB.`, 413);
      files[role] = value;
    }

    const apiKey = process.env.DWS_API_KEY;
    if (!apiKey) {
      if (isDemoPacket(files)) return Response.json(demoResult);
      return jsonError('Live extraction is not configured yet. Use the demo packet or add DWS_API_KEY.', 503);
    }

    const extracted = await Promise.all(roles.map((role) => extractWithDws(role, files[role], apiKey)));
    return Response.json(buildVerification(extracted));
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Verification failed.';
    return jsonError(message, 502);
  }
}
