import { createHash } from 'node:crypto';

export class PrintError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export class PrintQueue {
  constructor(send, { maxPending = 5, maxRemembered = 200, retentionMs = 10 * 60 * 1000 } = {}) {
    this.send = send;
    this.maxPending = maxPending;
    this.maxRemembered = maxRemembered;
    this.retentionMs = retentionMs;
    this.jobs = new Map();
    this.pending = [];
    this.running = false;
  }

  prune() {
    const cutoff = Date.now() - this.retentionMs;
    for (const [id, job] of this.jobs) {
      if (['submitted', 'error'].includes(job.state) && job.updatedAt < cutoff) this.jobs.delete(id);
    }
  }

  get(id) {
    this.prune();
    const job = this.jobs.get(id);
    if (!job) return null;
    return { id: job.id, state: job.state, error: job.error || null };
  }

  submit(id, data) {
    this.prune();
    const fingerprint = createHash('sha256').update(data).digest('hex');
    const existing = this.jobs.get(id);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new PrintError(409, 'This job ID was already used for a different photo.');
      return this.get(id);
    }
    if (this.pending.length + Number(this.running) >= this.maxPending) throw new PrintError(429, 'The print queue is full. Please wait before trying again.');
    if (this.jobs.size >= this.maxRemembered) {
      const oldest = [...this.jobs.values()].find(job => ['submitted', 'error'].includes(job.state));
      if (oldest) this.jobs.delete(oldest.id);
    }
    const now = Date.now();
    this.jobs.set(id, { id, fingerprint, state: 'queued', updatedAt: now });
    this.pending.push({ id, data });
    void this.drain();
    return this.get(id);
  }

  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending.length) {
        const entry = this.pending.shift();
        const job = this.jobs.get(entry.id);
        job.state = 'sending';
        try {
          await this.send(entry.data);
          job.state = 'submitted';
        } catch (error) {
          console.error('Printer submission failed:', error.message);
          job.state = 'error';
          job.error = 'Could not send this print. Some data may have reached the printer. Check the paper and printer before trying again.';
          // A partial raster can leave the printer waiting for more bytes.
          // Do not send following jobs into that uncertain buffer state.
          for (const waiting of this.pending.splice(0)) {
            const blocked = this.jobs.get(waiting.id);
            blocked.state = 'error';
            blocked.error = 'This job was not sent because the previous print failed. Ask the host to check the printer before trying again.';
            blocked.updatedAt = Date.now();
            waiting.data = null;
          }
        } finally {
          entry.data = null; // Drop photo bytes as soon as submission ends.
          job.updatedAt = Date.now();
        }
      }
    } finally { this.running = false; }
  }
}
