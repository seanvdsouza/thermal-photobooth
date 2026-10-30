import { PHOTO_SIZE } from './imageProcessing.js';

export function packPhoto(black) {
  if (black.length !== PHOTO_SIZE * PHOTO_SIZE) throw new Error('The photo is not ready for printing.');
  const packed = new Uint8Array(black.length / 8);
  for (let i = 0; i < black.length; i++) {
    if (black[i] !== 0 && black[i] !== 1) throw new Error('The photo must be black and white.');
    if (black[i]) packed[i >> 3] |= 0x80 >> (i & 7);
  }
  return packed;
}

async function readResponse(response) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.id || !['queued', 'sending', 'submitted', 'error'].includes(result.state)) {
    const error = new Error(result?.error || 'The print service is unavailable. Check that it is running on the MacBook.');
    error.notAccepted = response.status >= 400 && response.status < 500;
    throw error;
  }
  return result;
}

export async function submitPrint(id, black) {
  const response = await fetch('/api/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-Print-Job-Id': id, 'X-Photo-Width': String(PHOTO_SIZE), 'X-Photo-Height': String(PHOTO_SIZE) },
    body: packPhoto(black),
    signal: AbortSignal.timeout(10000),
  });
  return readResponse(response);
}

export async function readPrintStatus(id) {
  return readResponse(await fetch(`/api/print/${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) }));
}
