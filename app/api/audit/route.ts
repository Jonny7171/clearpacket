const DWS_ENDPOINT = 'https://api.nutrient.io/build';

type AuditPayload = {
  product?: string;
  packetId?: string;
  generatedAt?: string;
  extractionEngine?: string;
  sourceDocuments?: Array<{ label?: string; fileName?: string }>;
  verification?: {
    confidence?: number;
    checks?: Array<{ name?: string; value?: string; status?: string }>;
    exception?: {
      sku?: string;
      invoiceQuantity?: number;
      orderedQuantity?: number;
      receivedQuantity?: number;
      overage?: number;
    };
  };
  humanDecision?: {
    label?: string;
    note?: string;
    decidedAt?: string;
  } | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeDate(value: unknown) {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) + ' UTC';
}

function auditHtml(audit: AuditPayload) {
  const packetId = escapeHtml(audit.packetId || 'ClearPacket audit');
  const documents = (audit.sourceDocuments || []).map((document) => `
    <tr><td>${escapeHtml(document.label)}</td><td>${escapeHtml(document.fileName)}</td><td class="ok">Included</td></tr>
  `).join('');
  const checks = (audit.verification?.checks || []).map((check) => `
    <tr><td>${escapeHtml(check.name)}</td><td>${escapeHtml(check.value)}</td><td class="${check.status === 'pass' ? 'ok' : 'review'}">${check.status === 'pass' ? 'Passed' : 'Reviewed'}</td></tr>
  `).join('');
  const exception = audit.verification?.exception || {};
  const decision = audit.humanDecision;

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: Letter; margin: 0; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #17221c; background: #f5f3eb; font-family: Arial, Helvetica, sans-serif; }
        .page { min-height: 11in; padding: 0.55in 0.62in; }
        .top { display: flex; justify-content: space-between; align-items: center; padding-bottom: 18px; border-bottom: 2px solid #17221c; }
        .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .packet { padding: 7px 10px; border: 1px solid #17221c; border-radius: 20px; font-size: 10px; font-weight: 700; }
        h1 { max-width: 520px; margin: 34px 0 8px; font-size: 42px; line-height: 0.95; letter-spacing: -2px; }
        .sub { margin: 0 0 30px; color: #667169; font-size: 12px; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 27px; }
        .summary div { padding: 15px; border: 1px solid #17221c; border-radius: 10px; }
        .summary span, h2 { display: block; color: #667169; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
        .summary strong { display: block; margin-top: 6px; font-size: 22px; }
        h2 { margin: 23px 0 9px; color: #17221c; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { padding: 10px 8px; border-bottom: 1px solid rgba(23,34,28,0.18); text-align: left; }
        th { color: #667169; font-size: 8px; text-transform: uppercase; letter-spacing: 0.8px; }
        td:last-child { text-align: right; font-weight: 700; }
        .ok { color: #24703d; }
        .review { color: #9b461f; }
        .evidence { margin-top: 12px; padding: 17px; border-radius: 12px; background: #f3ad82; }
        .evidence-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
        .evidence-grid div { padding: 10px; background: rgba(255,255,255,0.45); border-radius: 8px; }
        .evidence-grid span { display: block; font-size: 8px; text-transform: uppercase; }
        .evidence-grid strong { display: block; margin-top: 4px; font-size: 17px; }
        .decision { margin-top: 18px; padding: 17px; border: 1px solid #17221c; border-radius: 12px; background: #d7ff52; }
        .decision strong { display: block; margin: 6px 0; font-size: 17px; }
        .decision p { margin: 0; font-size: 10px; line-height: 1.5; }
        .footer { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 12px; border-top: 1px solid #17221c; color: #667169; font-size: 8px; text-transform: uppercase; letter-spacing: 0.7px; }
      </style>
    </head>
    <body>
      <main class="page">
        <div class="top"><div class="brand">ClearPacket</div><div class="packet">${packetId}</div></div>
        <h1>Document verification audit</h1>
        <p class="sub">Evidence, deterministic checks, and the final human decision in one record.</p>

        <section class="summary">
          <div><span>Confidence</span><strong>${escapeHtml(audit.verification?.confidence)}%</strong></div>
          <div><span>Extraction engine</span><strong>${escapeHtml(audit.extractionEngine)}</strong></div>
          <div><span>Generated</span><strong style="font-size:13px">${escapeHtml(safeDate(audit.generatedAt))}</strong></div>
        </section>

        <h2>Source documents</h2>
        <table><thead><tr><th>Role</th><th>Filename</th><th>Status</th></tr></thead><tbody>${documents}</tbody></table>

        <h2>Verification checks</h2>
        <table><thead><tr><th>Check</th><th>Result</th><th>Status</th></tr></thead><tbody>${checks}</tbody></table>

        <section class="evidence">
          <h2 style="margin:0;color:#17221c">Exception evidence</h2>
          <div class="evidence-grid">
            <div><span>Item</span><strong>${escapeHtml(exception.sku)}</strong></div>
            <div><span>Ordered</span><strong>${escapeHtml(exception.orderedQuantity)}</strong></div>
            <div><span>Invoiced</span><strong>${escapeHtml(exception.invoiceQuantity)}</strong></div>
            <div><span>Received</span><strong>${escapeHtml(exception.receivedQuantity)}</strong></div>
          </div>
          <p style="margin:11px 0 0;font-size:10px">Calculated invoice overage: $${escapeHtml(Number(exception.overage || 0).toFixed(2))}</p>
        </section>

        <section class="decision">
          <span style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:1px">Human decision</span>
          <strong>${escapeHtml(decision?.label || 'No decision recorded')}</strong>
          <p>${escapeHtml(decision?.note || 'The exception remains open.')}</p>
          <p style="margin-top:6px;color:#526057">${escapeHtml(safeDate(decision?.decidedAt))}</p>
        </section>

        <div class="footer"><span>Built for decisions that need evidence</span><span>PDF generated by Nutrient DWS</span></div>
      </main>
    </body>
  </html>`;
}

export async function POST(request: Request) {
  try {
    const audit = await request.json() as AuditPayload;
    if (!audit.packetId || !audit.verification?.checks?.length) {
      return Response.json({ error: 'The audit record is incomplete.' }, { status: 400 });
    }

    const apiKey = process.env.DWS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify(audit, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${audit.packetId}-audit.json"`,
        },
      });
    }

    const body = new FormData();
    body.append('audit.html', new Blob([auditHtml(audit)], { type: 'text/html' }), 'audit.html');
    body.append('instructions', JSON.stringify({ parts: [{ html: 'audit.html' }] }));
    const response = await fetch(DWS_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      return Response.json({ error: `Nutrient could not build the audit PDF: ${response.status} ${detail}` }, { status: 502 });
    }

    return new Response(await response.arrayBuffer(), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${audit.packetId}-audit.pdf"`,
      },
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Audit export failed.';
    return Response.json({ error: message }, { status: 500 });
  }
}
