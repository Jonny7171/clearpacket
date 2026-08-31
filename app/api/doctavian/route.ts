import { env } from 'cloudflare:workers';
import { buildDoctavianData } from '../../../scripts/lib/doctavian-packet.mjs';

const API_BASE = 'https://demo.api.doctavian.com';
const TEMPLATE_NAME = 'clearpacket-credit-acknowledgement.docx';

type DoctavianRequest = {
  packetId?: string;
  verification?: {
    exception?: {
      sku?: string;
      description?: string;
      invoiceQuantity?: number;
      orderedQuantity?: number;
      receivedQuantity?: number;
      unitPrice?: number;
    };
  };
  humanDecision?: {
    action?: 'approve-invoice' | 'use-received';
    decidedAt?: string;
  } | null;
};

type DoctavianConfig = {
  DOCTAVIAN_API_KEY?: string;
  DOCTAVIAN_ACCESS_TOKEN?: string;
  DOCTAVIAN_REFRESH_TOKEN?: string;
  DOCTAVIAN_CLIENT_ID?: string;
  DOCTAVIAN_AUTH_PROVIDER?: string;
};

function config(): DoctavianConfig {
  const worker = env as unknown as DoctavianConfig;
  return {
    DOCTAVIAN_API_KEY: worker.DOCTAVIAN_API_KEY || process.env.DOCTAVIAN_API_KEY,
    DOCTAVIAN_ACCESS_TOKEN: worker.DOCTAVIAN_ACCESS_TOKEN || process.env.DOCTAVIAN_ACCESS_TOKEN,
    DOCTAVIAN_REFRESH_TOKEN: worker.DOCTAVIAN_REFRESH_TOKEN || process.env.DOCTAVIAN_REFRESH_TOKEN,
    DOCTAVIAN_CLIENT_ID: worker.DOCTAVIAN_CLIENT_ID || process.env.DOCTAVIAN_CLIENT_ID,
    DOCTAVIAN_AUTH_PROVIDER: worker.DOCTAVIAN_AUTH_PROVIDER || process.env.DOCTAVIAN_AUTH_PROVIDER,
  };
}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

async function responseDetail(response: Response) {
  return (await response.text()).slice(0, 700);
}

async function accessToken(settings: DoctavianConfig) {
  if (!settings.DOCTAVIAN_REFRESH_TOKEN || !settings.DOCTAVIAN_CLIENT_ID) {
    return settings.DOCTAVIAN_ACCESS_TOKEN || '';
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: settings.DOCTAVIAN_REFRESH_TOKEN,
    client_id: settings.DOCTAVIAN_CLIENT_ID,
  });
  const provider = settings.DOCTAVIAN_AUTH_PROVIDER || 'google';
  const response = await fetch(`${API_BASE}/public/v1/auth/${encodeURIComponent(provider)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Doctavian sign-in refresh failed: ${response.status} ${await responseDetail(response)}`);
  const payload = await response.json() as {
    access_token?: string;
    accessToken?: string;
    result?: { data?: { access_token?: string; accessToken?: string } };
  };
  const token = payload.access_token || payload.accessToken || payload.result?.data?.access_token || payload.result?.data?.accessToken;
  if (!token) throw new Error('Doctavian did not return an access token.');
  return token;
}

function authorizedHeaders(apiKey: string, token: string, extra: HeadersInit = {}) {
  return {
    Authorization: `Bearer ${token}`,
    'X-Api-Key': apiKey,
    ...extra,
  };
}

async function uploadFile(path: 'template' | 'data', file: Blob, fileName: string, headers: HeadersInit) {
  const body = new FormData();
  body.append('file', file, fileName);
  const response = await fetch(`${API_BASE}/v1/documents/${path}/upload`, {
    method: 'POST',
    headers,
    body,
  });
  if (!response.ok) throw new Error(`Doctavian ${path} upload failed: ${response.status} ${await responseDetail(response)}`);
  const payload = await response.json() as { result?: { data?: { files?: Array<{ id?: string }> } } };
  const id = payload.result?.data?.files?.[0]?.id;
  if (!id) throw new Error(`Doctavian ${path} upload did not return a file id.`);
  return id;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as DoctavianRequest;
    const decision = payload.humanDecision;
    const exception = payload.verification?.exception;
    if (!payload.packetId || !decision?.action || !decision.decidedAt || !exception) {
      return jsonError('Record the review decision before generating the acknowledgement.', 400);
    }
    if (!['approve-invoice', 'use-received'].includes(decision.action)) {
      return jsonError('The review decision is not valid.', 400);
    }
    const verifiedNumbers = [
      exception.invoiceQuantity,
      exception.orderedQuantity,
      exception.receivedQuantity,
      exception.unitPrice,
    ];
    if (!verifiedNumbers.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
      return jsonError('The verified quantities and unit price are not valid.', 400);
    }

    const settings = config();
    if (!settings.DOCTAVIAN_API_KEY) return jsonError('Doctavian generation is not configured yet.', 503);
    const token = await accessToken(settings);
    if (!token) return jsonError('Doctavian sign-in is not configured yet.', 503);
    const headers = authorizedHeaders(settings.DOCTAVIAN_API_KEY, token);

    const templateResponse = await fetch(new URL(`/doctavian/${TEMPLATE_NAME}`, request.url));
    if (!templateResponse.ok) throw new Error('The Doctavian template is missing from this deployment.');
    const templateBlob = new Blob([await templateResponse.arrayBuffer()], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const data = buildDoctavianData({
      packetId: payload.packetId,
      action: decision.action,
      decidedAt: decision.decidedAt,
      sku: exception.sku,
      description: exception.description,
      invoiceQuantity: exception.invoiceQuantity,
      orderedQuantity: exception.orderedQuantity,
      receivedQuantity: exception.receivedQuantity,
      unitPrice: exception.unitPrice,
    });
    const dataBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const [templateId, dataId] = await Promise.all([
      uploadFile('template', templateBlob, TEMPLATE_NAME, headers),
      uploadFile('data', dataBlob, `${payload.packetId}-credit-data.json`, headers),
    ]);

    const documentName = `${payload.packetId}-supplier-credit-acknowledgement`;
    const generation = await fetch(`${API_BASE}/v1/documents/document/generate`, {
      method: 'POST',
      headers: authorizedHeaders(settings.DOCTAVIAN_API_KEY, token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        externalContext: { id: `clearpacket-${payload.packetId}-${Date.now()}` },
        template: {
          name: TEMPLATE_NAME,
          urn: templateId,
          fileFormat: 'docx',
          loadMethod: 'Storage',
          options: {},
        },
        data: { loadMethod: 'Storage', urn: dataId },
        document: {
          name: documentName,
          fileFormat: 'pdf',
          deliveryMethod: 'Storage',
          path: 'root',
          locale: 'en',
          timezone: 'America/Toronto',
          options: {},
        },
      }),
    });
    if (!generation.ok) throw new Error(`Doctavian generation failed: ${generation.status} ${await responseDetail(generation)}`);
    const generated = await generation.json() as { result?: { data?: { document?: { urn?: string } } } };
    const documentUrn = generated.result?.data?.document?.urn;
    if (!documentUrn) throw new Error('Doctavian generation did not return a document id.');

    const download = await fetch(`${API_BASE}/v1/documents/document/${encodeURIComponent(documentUrn)}/download`, {
      headers,
    });
    if (!download.ok) throw new Error(`Doctavian download failed: ${download.status} ${await responseDetail(download)}`);

    return new Response(await download.arrayBuffer(), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${documentName}.pdf"`,
        'X-ClearPacket-Generator': 'Doctavian',
      },
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Doctavian generation failed.';
    return jsonError(message, 502);
  }
}
