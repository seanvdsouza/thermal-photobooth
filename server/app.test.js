import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import net from 'node:net';
import { get as httpGet } from 'node:http';
import { createApp } from './app.js';

const config = { printableWidthDots: 8, topMarginDots: 2, bottomMarginDots: 3, rotate180: true, feedDots: 0, cut: 'feed-partial', bandHeight: 0 };
async function serve(t, options) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}
function post(url, id, body = Buffer.alloc(8), extraHeaders = {}) {
  return fetch(`${url}/api/print`, { method: 'POST', body, headers: { 'Content-Type': 'application/octet-stream', 'X-Print-Job-Id': id, 'X-Photo-Width': '8', 'X-Photo-Height': '8', ...extraHeaders } });
}

test('API validates size/dimensions/type/origin and keeps duplicate POSTs idempotent', async t => {
  let sent = 0, release;
  const url = await serve(t, { config, send: () => { sent++; return new Promise(resolve => { release = resolve; }); } });
  const id = randomUUID();
  let response = await post(url, id);
  assert.equal(response.status, 202);
  assert.equal((await response.json()).state, 'sending');
  assert.equal((await post(url, id)).status, 202);
  assert.equal(sent, 1);
  assert.equal((await post(url, id, Buffer.alloc(8, 255))).status, 409);
  assert.equal((await post(url, randomUUID(), Buffer.alloc(7))).status, 400);
  assert.equal((await post(url, randomUUID(), Buffer.alloc(9))).status, 413);
  assert.equal((await post(url, randomUUID(), Buffer.alloc(8), { 'X-Photo-Width': '16' })).status, 400);
  assert.equal((await post(url, randomUUID(), Buffer.alloc(8), { 'Content-Type': 'application/json' })).status, 415);
  assert.equal((await post(url, randomUUID(), Buffer.alloc(8), { Origin: 'https://unrelated.example' })).status, 403);
  const foreignHostStatus = await new Promise((resolve, reject) => {
    httpGet(`${url}/api/health`, { headers: { Host: 'unrelated.example' } }, response => {
      response.resume(); resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(foreignHostStatus, 403);
  assert.equal(sent, 1);
  release();
  response = await fetch(`${url}/api/print/${id}`);
  assert.equal((await response.json()).state, 'submitted');
  assert.equal((await fetch(`${url}/api/print/${randomUUID()}`)).status, 404);
});

test('real TCP transport delivers the encoded photo to a fake printer', async t => {
  let received;
  const bytes = new Promise(resolve => { received = resolve; });
  const printer = net.createServer(socket => {
    const chunks = [];
    socket.on('data', chunk => chunks.push(chunk));
    socket.on('end', () => { received(Buffer.concat(chunks)); socket.end(); });
  }).listen(0, '127.0.0.1');
  await once(printer, 'listening');
  t.after(() => new Promise(resolve => printer.close(resolve)));
  const url = await serve(t, { config: { ...config, host: '127.0.0.1', port: printer.address().port, timeoutMs: 1000 } });
  assert.equal((await post(url, randomUUID())).status, 202);
  const data = await bytes;
  assert.equal(data.subarray(0, 13).toString('hex'), '1b401b61011d76300001000d00');
  assert.equal(data.length, 5 + 8 + 13 + 4);
  assert.equal(data.subarray(-4).toString('hex'), '1d564200');
});
