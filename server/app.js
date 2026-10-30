import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeJob, validateConfig } from './encode-job.js';
import { PrintQueue, PrintError } from './print-queue.js';
import { connectPrinter } from '../printer/transport.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const jobIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const localNames = new Set(['localhost', '127.0.0.1', '[::1]']);

export function createApp({ config, send = bytes => connectPrinter(config, bytes) }) {
  validateConfig(config);
  const app = express();
  app.disable('x-powered-by');
  const width = config.printableWidthDots;
  const photoBytes = width / 8 * width;
  const queue = new PrintQueue(send);

  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!localNames.has(req.hostname)) return res.status(403).json({ error: 'This print service accepts local requests only.' });
    const origin = req.get('origin');
    if (origin) {
      try {
        const url = new URL(origin);
        const requestHost = req.get('host');
        const allowed = url.protocol === 'http:' && localNames.has(url.hostname) &&
          (url.host === requestHost || ['5173', '4174'].includes(url.port));
        if (!allowed) return res.status(403).json({ error: 'This origin is not allowed to print.' });
      } catch { return res.status(403).json({ error: 'Invalid request origin.' }); }
    }
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site printing is not allowed.' });
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ready: true, photoWidth: width, photoHeight: width }));

  app.post('/api/print', express.raw({ type: 'application/octet-stream', limit: photoBytes }), (req, res) => {
    if (!req.is('application/octet-stream')) throw new PrintError(415, 'Send a packed monochrome photo.');
    const id = req.get('x-print-job-id');
    if (!id || !jobIdPattern.test(id)) throw new PrintError(400, 'A valid print job ID is required.');
    if (req.get('x-photo-width') !== String(width) || req.get('x-photo-height') !== String(width)) throw new PrintError(400, `The photo must be ${width} × ${width} pixels.`);
    if (!Buffer.isBuffer(req.body) || req.body.length !== photoBytes) throw new PrintError(400, 'The packed photo has an invalid size.');
    const data = encodeJob(req.body, config);
    const job = queue.submit(id.toLowerCase(), data);
    res.status(202).json(job);
  });

  app.get('/api/print/:id', (req, res) => {
    if (!jobIdPattern.test(req.params.id)) throw new PrintError(400, 'Invalid job ID.');
    const job = queue.get(req.params.id.toLowerCase());
    if (!job) throw new PrintError(404, 'This print status has expired or the service restarted. Check the printer before sending again.');
    res.json(job);
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }));
  app.use(express.static(path.join(root, 'dist')));
  app.use((error, _req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 413 ? 'The photo exceeds the allowed size.' : status < 500 ? error.message : 'The print service encountered an error.' });
  });
  return app;
}
