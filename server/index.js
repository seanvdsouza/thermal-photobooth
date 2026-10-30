import { readFile } from 'node:fs/promises';
import { createApp } from './app.js';

const config = JSON.parse(await readFile(new URL('../printer/config.json', import.meta.url), 'utf8'));
const port = Number(process.env.PRINT_SERVER_PORT || 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PRINT_SERVER_PORT.');
const server = createApp({ config }).listen(port, '127.0.0.1', () => {
  console.log(`Photobooth print service: http://127.0.0.1:${port}`);
  console.log(`LAN printer: ${config.host}:${config.port}. One submission per job; no automatic retry.`);
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
