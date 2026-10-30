import test from 'node:test';
import assert from 'node:assert/strict';
import { PrintQueue } from './print-queue.js';

const tick = () => new Promise(resolve => setImmediate(resolve));

test('queue sends one at a time, deduplicates even at capacity and rejects changed jobs', async () => {
  const sent = [], releases = [];
  const queue = new PrintQueue(data => { sent.push(data.toString()); return new Promise(resolve => releases.push(resolve)); }, { maxPending: 2 });
  queue.submit('a', Buffer.from('first'));
  queue.submit('b', Buffer.from('second'));
  assert.equal(queue.get('a').state, 'sending');
  assert.equal(queue.get('b').state, 'queued');
  assert.deepEqual(sent, ['first']);
  queue.submit('a', Buffer.from('first'));
  assert.throws(() => queue.submit('a', Buffer.from('changed')), { status: 409 });
  assert.throws(() => queue.submit('c', Buffer.from('third')), { status: 429 });
  releases.shift()(); await tick();
  assert.deepEqual(sent, ['first', 'second']);
  releases.shift()(); await tick();
  assert.equal(queue.get('a').state, 'submitted');
  assert.equal(queue.get('b').state, 'submitted');
  assert.equal(queue.pending.length, 0);
  assert.ok([...queue.jobs.values()].every(job => !('data' in job)));
});

test('failed transmission is not retried and following jobs are discarded safely', async t => {
  t.mock.method(console, 'error', () => {});
  let reject, sent = 0;
  const queue = new PrintQueue(() => { sent++; return new Promise((_, fail) => { reject = fail; }); });
  queue.submit('a', Buffer.from('first'));
  queue.submit('b', Buffer.from('second'));
  reject(new Error('Simulated offline printer')); await tick();
  assert.equal(queue.get('a').state, 'error');
  assert.equal(queue.get('b').state, 'error');
  assert.equal(sent, 1);
  assert.equal(queue.pending.length, 0);
  queue.submit('a', Buffer.from('first'));
  assert.equal(sent, 1);
});

test('metadata is bounded without breaking remembered job deduplication', async () => {
  let sent = 0;
  const queue = new PrintQueue(async () => { sent++; }, { maxRemembered: 2 });
  queue.submit('a', Buffer.from('a')); await tick();
  queue.submit('b', Buffer.from('b')); await tick();
  queue.submit('a', Buffer.from('a')); await tick();
  assert.equal(sent, 2);
  queue.submit('c', Buffer.from('c')); await tick();
  assert.equal(queue.jobs.size, 2);
  assert.equal(queue.get('a'), null);
});
