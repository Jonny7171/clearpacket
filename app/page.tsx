'use client';

import { ChangeEvent, useRef, useState } from 'react';

type DocumentRole = 'purchaseOrder' | 'invoice' | 'receipt';
type RunState = 'ready' | 'running' | 'complete' | 'error';

type PacketDocument = {
  role: DocumentRole;
  label: string;
  fileName: string;
  detail: string;
  tone: string;
  url: string;
  file?: File;
};

type Check = {
  name: string;
  value: string;
  status: 'pass' | 'warn';
};

type VerificationResult = {
  packetId: string;
  exceptionCount: number;
  checks: Check[];
  exception: {
    sku: string;
    description: string;
    invoiceQuantity: number;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    overage: number;
  };
  engine: 'nutrient-dws' | 'local-demo';
  completedAt: string;
};

type ReviewDecision = {
  action: 'approve-invoice' | 'use-received';
  label: string;
  note: string;
  decidedAt: string;
};

const sampleDocuments: PacketDocument[] = [
  {
    role: 'purchaseOrder',
    label: 'Purchase order',
    fileName: 'PO-1048.pdf',
    detail: 'Ordered Aug 20, 2026',
    tone: 'clay',
    url: '/demo/PO-1048.pdf',
  },
  {
    role: 'invoice',
    label: 'Supplier invoice',
    fileName: 'INV-7782.pdf',
    detail: 'Dated Aug 26, 2026',
    tone: 'lime',
    url: '/demo/INV-7782.pdf',
  },
  {
    role: 'receipt',
    label: 'Delivery receipt',
    fileName: 'RECEIPT-592.pdf',
    detail: 'Received Aug 25, 2026',
    tone: 'blue',
    url: '/demo/RECEIPT-592.pdf',
  },
];

const previewResult: VerificationResult = {
  packetId: 'CP-1048',
  exceptionCount: 2,
  checks: [
    { name: 'Supplier identity', value: 'Exact match', status: 'pass' },
    { name: 'PO reference', value: 'PO-1048', status: 'pass' },
    { name: 'Line quantities', value: '12 billed / 10 received', status: 'warn' },
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
  completedAt: '2026-08-27T12:00:00.000Z',
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function Home() {
  const [documents, setDocuments] = useState<PacketDocument[]>(sampleDocuments);
  const [result, setResult] = useState<VerificationResult>(previewResult);
  const [runState, setRunState] = useState<RunState>('ready');
  const [error, setError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<ReviewDecision['action']>('use-received');
  const fileInputs = useRef<Record<DocumentRole, HTMLInputElement | null>>({
    purchaseOrder: null,
    invoice: null,
    receipt: null,
  });

  function replaceDocument(role: DocumentRole, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF for each source document.');
      setRunState('error');
      return;
    }

    setDocuments((current) => current.map((document) => (
      document.role === role
        ? { ...document, file, fileName: file.name, detail: 'New PDF ready', url: URL.createObjectURL(file) }
        : document
    )));
    setDecision(null);
    setRunState('ready');
    setError('');
  }

  function resetDemo() {
    setDocuments(sampleDocuments);
    setResult(previewResult);
    setDecision(null);
    setRunState('ready');
    setError('');
  }

  async function documentFile(document: PacketDocument) {
    if (document.file) return document.file;
    const response = await fetch(document.url);
    if (!response.ok) throw new Error(`Could not load ${document.fileName}`);
    return new File([await response.blob()], document.fileName, { type: 'application/pdf' });
  }

  async function runVerification() {
    setRunState('running');
    setError('');
    setDecision(null);

    try {
      const formData = new FormData();
      await Promise.all(documents.map(async (document) => {
        formData.append(document.role, await documentFile(document));
      }));

      const response = await fetch('/api/verify', { method: 'POST', body: formData });
      const payload = await response.json() as VerificationResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Verification failed.');

      setResult(payload);
      setRunState('complete');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed.');
      setRunState('error');
    }
  }

  function saveDecision() {
    const useReceived = pendingDecision === 'use-received';
    setDecision({
      action: pendingDecision,
      label: useReceived ? 'Pay for 10 received units' : 'Approve all 12 invoiced units',
      note: useReceived
        ? `Invoice adjusted by ${currency.format(result.exception.overage)} to match received quantity.`
        : `Invoice quantity accepted despite a ${result.exception.invoiceQuantity - result.exception.receivedQuantity} unit variance.`,
      decidedAt: new Date().toISOString(),
    });
    setReviewOpen(false);
  }

  async function exportAudit() {
    const audit = {
      product: 'ClearPacket',
      packetId: result.packetId,
      generatedAt: new Date().toISOString(),
      extractionEngine: result.engine,
      sourceDocuments: documents.map(({ role, label, fileName }) => ({ role, label, fileName })),
      verification: result,
      humanDecision: decision,
    };
    setExporting(true);
    setError('');
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audit),
      });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        throw new Error(payload.error || 'Audit export failed.');
      }
      const contentType = response.headers.get('content-type') || '';
      const extension = contentType.includes('application/pdf') ? 'pdf' : 'json';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(await response.blob());
      link.download = `${result.packetId}-audit.${extension}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Audit export failed.');
    } finally {
      setExporting(false);
    }
  }

  const running = runState === 'running';
  const reviewResolved = Boolean(decision);

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="ClearPacket home">
          <span className="brand-mark" aria-hidden="true">CP</span>
          <span>ClearPacket</span>
        </a>
        <div className="nav-context">
          <span className="context-label">Northwind Fabrication</span>
          <span className="context-separator">/</span>
          <span className="context-name">Accounts payable review</span>
        </div>
        <div className="nav-actions">
          <span className="secure-pill"><i /> Nutrient DWS connected</span>
          <span className="environment-label">Demo workspace</span>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow"><span>Packet {result.packetId}</span><span>Queued August 27, 2026</span><b>{reviewResolved ? 'Reviewed' : 'Review required'}</b></div>
        <div className="hero-grid">
          <div><h1>INV-7782 needs a quantity decision</h1></div>
          <div className="hero-copy">
            <p>
              Apex Industrial Supply billed 12 protective sleeves. The purchase order
              and delivery receipt both show 10.
            </p>
            <div className="proof-row">
              <span><small>Invoice difference</small><b>{currency.format(result.exception.overage)}</b></span>
              <span><small>Documents matched</small><b>3</b></span>
              <span><small>Review owner</small><b>J. Gagnon</b></span>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace" aria-label="Document verification workspace">
        <div className="packet-panel">
          <div className="panel-heading">
            <div><span className="section-number">1</span><h2>Documents in this packet</h2></div>
            <button className="add-button" type="button" onClick={resetDemo}><span>↺</span> Use demo packet</button>
          </div>

          <div className="document-stack">
            {documents.map((document, index) => (
              <article className={`document-card ${document.tone}`} key={document.role}>
                <a className="document-open" href={document.url} target="_blank" rel="noreferrer" aria-label={`Open ${document.label}`}>
                  <div className="paper-icon" aria-hidden="true"><span>PDF</span></div>
                  <div className="document-copy">
                    <span className="document-label">{document.label}</span>
                    <strong>{document.fileName}</strong>
                    <small>{document.detail}</small>
                  </div>
                </a>
                <div className="document-state">
                  <span className="check-dot">✓</span>
                  <button type="button" onClick={() => fileInputs.current[document.role]?.click()}>Replace</button>
                </div>
                <input
                  ref={(element) => { fileInputs.current[document.role] = element; }}
                  className="visually-hidden"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => replaceDocument(document.role, event)}
                  aria-label={`Replace ${document.label}`}
                />
                <span className="stack-index">0{index + 1}</span>
              </article>
            ))}
          </div>

          <button className="verify-button" type="button" onClick={runVerification} disabled={running}>
            <span>{running ? 'Extracting and matching documents...' : 'Run verification'}</span>
            <span className={`button-arrow ${running ? 'working' : ''}`} aria-hidden="true">{running ? '·' : '↗'}</span>
          </button>
          {error && <p className="error-note" role="alert">{error}</p>}
          <p className="privacy-note">Files are processed for this packet only. ClearPacket does not store the uploaded PDFs.</p>
        </div>

        <aside className="result-panel" aria-label="Verification result" aria-busy={running}>
          <div className="result-topline">
            <div><span className="section-number light">2</span><h2>Comparison result</h2></div>
            <div className="result-badges">
              <span className="engine-badge">{result.engine === 'nutrient-dws' ? 'Nutrient DWS' : 'Demo data'}</span>
              <span className="packet-id">{result.packetId}</span>
            </div>
          </div>

          <div className={`issue-summary ${reviewResolved ? 'resolved' : ''}`}>
            <div className="issue-mark" aria-hidden="true">{reviewResolved ? '✓' : '!'}</div>
            <div>
              <span className="score-label">{reviewResolved ? 'Review complete' : 'One decision required'}</span>
              <strong>{reviewResolved ? decision?.label : `Quantity mismatch on ${result.exception.sku}`}</strong>
              <p>{reviewResolved ? decision?.note : 'Supplier, PO reference, and unit price agree. The invoice quantity does not.'}</p>
            </div>
          </div>

          <div className="checks">
            {result.checks.map((check) => (
              <div className="check-row" key={check.name}>
                <span className={`status-icon ${reviewResolved && check.status === 'warn' ? 'resolved' : check.status}`} aria-hidden="true">
                  {check.status === 'pass' || reviewResolved ? '✓' : '!'}
                </span>
                <span className="check-name">{check.name}</span>
                <strong>{reviewResolved && check.status === 'warn' ? 'Reviewed' : check.value}</strong>
              </div>
            ))}
          </div>

          <div className={`exception-card ${reviewResolved ? 'reviewed' : ''}`}>
            <div className="exception-head">
              <span>{reviewResolved ? 'Decision recorded' : 'Decision required'}</span>
              <b>{reviewResolved ? 'Closed' : result.exception.sku}</b>
            </div>
            {reviewResolved ? (
              <>
                <p>{decision?.label}</p>
                <small className="decision-time">Logged {new Date(decision!.decidedAt).toLocaleString()}</small>
              </>
            ) : (
              <p>
                Invoice line {result.exception.sku} lists {result.exception.invoiceQuantity} units. The PO and delivery receipt both list {result.exception.receivedQuantity}.
              </p>
            )}
            <div className="exception-actions">
              <button type="button" onClick={() => setReviewOpen(true)}>{reviewResolved ? 'Change decision' : 'Open review'}</button>
              <button className="secondary-action" type="button" onClick={exportAudit} disabled={exporting}>{exporting ? 'Building PDF...' : 'Export audit'}</button>
            </div>
          </div>
        </aside>
      </section>

      <footer>
        <p>Nutrient DWS extracts the documents. ClearPacket compares the values and records the review.</p>
        <div className="footer-links">
          <a href="https://github.com/Jonny7171/clearpacket" target="_blank" rel="noreferrer">View source</a>
          <span>Fictional demonstration data</span>
        </div>
      </footer>

      {reviewOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setReviewOpen(false)}>
          <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <span className="modal-kicker">Human review</span>
                <h2 id="review-title">Resolve quantity mismatch</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setReviewOpen(false)} aria-label="Close review">×</button>
            </div>

            <div className="evidence-grid">
              <div><span>Purchase order</span><strong>{result.exception.orderedQuantity}</strong><small>units ordered</small></div>
              <div><span>Supplier invoice</span><strong>{result.exception.invoiceQuantity}</strong><small>units billed</small></div>
              <div><span>Delivery receipt</span><strong>{result.exception.receivedQuantity}</strong><small>units received</small></div>
            </div>

            <p className="review-summary">
              The supplier billed {result.exception.invoiceQuantity - result.exception.receivedQuantity} extra units at {currency.format(result.exception.unitPrice)} each.
            </p>

            <fieldset className="decision-options">
              <legend>Choose the payable quantity</legend>
              <label className={pendingDecision === 'use-received' ? 'selected' : ''}>
                <input type="radio" name="decision" checked={pendingDecision === 'use-received'} onChange={() => setPendingDecision('use-received')} />
                <span><b>Pay for 10 received units</b><small>Reduce the invoice by {currency.format(result.exception.overage)}.</small></span>
              </label>
              <label className={pendingDecision === 'approve-invoice' ? 'selected' : ''}>
                <input type="radio" name="decision" checked={pendingDecision === 'approve-invoice'} onChange={() => setPendingDecision('approve-invoice')} />
                <span><b>Approve all 12 invoiced units</b><small>Accept the variance and retain it in the audit trail.</small></span>
              </label>
            </fieldset>

            <button className="save-decision" type="button" onClick={saveDecision}>Record decision</button>
          </section>
        </div>
      )}
    </main>
  );
}
