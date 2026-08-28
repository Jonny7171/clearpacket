#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { buildResolutionHtml, buildResolutionPacket } from './lib/resolution-packet.mjs';

function option(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

function textResult(result, toolName) {
  const text = result.content?.find((part) => part.type === 'text')?.text;
  if (!text) throw new Error(`${toolName} returned no text result.`);
  const payload = JSON.parse(text);
  if (!payload.success) throw new Error(`${toolName} failed: ${payload.error || 'unknown error'}`);
  return payload;
}

function cleanEnvironment(values) {
  return Object.fromEntries(Object.entries(values).filter((entry) => typeof entry[1] === 'string'));
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const instruction = option('--instruction', 'Prepare a supplier credit acknowledgement for the reviewed exception.');
  const outputDirectory = resolve(option('--out', 'output/foxit'));
  const packet = buildResolutionPacket({ instruction });
  const html = buildResolutionHtml(packet);
  const htmlPath = resolve(outputDirectory, `${packet.packetId}-resolution.html`);
  const pdfPath = resolve(outputDirectory, `${packet.packetId}-resolution.pdf`);

  await mkdir(dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, html, 'utf8');

  if (dryRun) {
    process.stdout.write(`${JSON.stringify({
      mode: 'dry-run',
      packetId: packet.packetId,
      creditAmount: packet.creditAmount,
      htmlPath,
      plannedToolCalls: ['upload_document', 'pdf_from_html', 'download_document', 'Foxit eSign createfolder'],
    }, null, 2)}\n`);
    return;
  }

  const clientId = process.env.FOXIT_CLOUD_API_CLIENT_ID;
  const clientSecret = process.env.FOXIT_CLOUD_API_CLIENT_SECRET;
  const signerEmail = option('--signer-email');
  const signerFirst = option('--signer-first', 'Supplier');
  const signerLast = option('--signer-last', 'Reviewer');

  if (!clientId || !clientSecret) {
    throw new Error('FOXIT_CLOUD_API_CLIENT_ID and FOXIT_CLOUD_API_CLIENT_SECRET are required for a live run.');
  }
  if (!signerEmail) throw new Error('--signer-email is required for a live run.');

  const serverBinary = resolve('node_modules/.bin/foxit-pdf-api-mcp-server');
  const transport = new StdioClientTransport({
    command: serverBinary,
    args: [],
    env: cleanEnvironment({
      ...process.env,
      FOXIT_CLOUD_API_HOST: process.env.FOXIT_CLOUD_API_HOST || 'https://na1.fusion.foxit.com/pdf-services',
      FOXIT_CLOUD_API_CLIENT_ID: clientId,
      FOXIT_CLOUD_API_CLIENT_SECRET: clientSecret,
    }),
  });
  const client = new Client({ name: 'clearpacket-resolution-agent', version: '1.0.0' }, { capabilities: {} });

  try {
    await client.connect(transport);
    const available = await client.listTools();
    const requiredTools = ['upload_document', 'pdf_from_html', 'download_document'];
    for (const toolName of requiredTools) {
      if (!available.tools.some((tool) => tool.name === toolName)) {
        throw new Error(`Foxit MCP server is missing required tool ${toolName}.`);
      }
    }

    const uploaded = textResult(await client.callTool({
      name: 'upload_document',
      arguments: { fileContent: Buffer.from(html).toString('base64'), fileName: `${packet.packetId}-resolution.html` },
    }), 'upload_document');
    const converted = textResult(await client.callTool({
      name: 'pdf_from_html',
      arguments: { documentId: uploaded.documentId, config: { pageMode: 'MULTIPLE_PAGE', scalingMode: 'SCALE' } },
    }), 'pdf_from_html');
    textResult(await client.callTool({
      name: 'download_document',
      arguments: { documentId: converted.resultDocumentId, outputPath: pdfPath, filename: `${packet.packetId}-resolution.pdf` },
    }), 'download_document');
  } finally {
    await client.close();
  }

  const pdf = await readFile(pdfPath);
  const esignHost = (process.env.FOXIT_ESIGN_HOST || 'https://na1.fusion.foxit.com').replace(/\/$/, '');
  const response = await fetch(`${esignHost}/esign/api/v1/folders/createfolder`, {
    method: 'POST',
    headers: {
      client_id: clientId,
      client_secret: clientSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folderName: `${packet.packetId} supplier credit acknowledgement`,
      inputType: 'base64',
      base64FileString: [pdf.toString('base64')],
      fileNames: [`${packet.packetId}-resolution.pdf`],
      parties: [{
        firstName: signerFirst,
        lastName: signerLast,
        emailId: signerEmail,
        permission: 'FILL_FIELDS_AND_SIGN',
        sequence: 1,
      }],
      processTextTags: true,
      processAcroFields: false,
      createEmbeddedSigningSession: true,
      embeddedSignersEmailIds: [signerEmail],
      sendNow: false,
    }),
  });
  const esign = await response.json();
  if (!response.ok) {
    throw new Error(`Foxit eSign failed with ${response.status}: ${JSON.stringify(esign).slice(0, 500)}`);
  }

  const sessions = esign.embeddedSigningSessions || esign.folder?.embeddedSigningSessions || [];
  const sessionUrl = sessions[0]?.embeddedSessionURL;
  const folderId = esign.folder?.folderId || esign.folderId;
  if (!sessionUrl || !folderId) throw new Error('Foxit eSign did not return a folder ID and embedded signing session.');

  process.stdout.write(`${JSON.stringify({
    mode: 'live',
    packetId: packet.packetId,
    creditAmount: packet.creditAmount,
    pdfPath,
    folderId,
    sessionUrl,
    sendNow: false,
    humanMustSign: true,
  }, null, 2)}\n`);
}

run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
