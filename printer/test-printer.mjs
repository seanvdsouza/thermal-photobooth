import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import net from 'node:net';
import { integer, initialize, rasterCommands, finishCommands } from './escpos.mjs';
import { makePattern, makePolaroid } from './patterns.mjs';
import { connectPrinter } from './transport.mjs';

const help = `Phase 1 — LAN printer test (no dependencies)

node printer/test-printer.mjs <probe|text|pattern|polaroid|cut> [options]

  --host IP           Printer's private LAN IPv4 address
  --port NUMBER       Candidate raw TCP port (default 9100)
  --width DOTS        Candidate printable width (default 576, multiple of 8)
  --top DOTS          Leading raster whitespace (default 32)
  --bottom DOTS       Trailing raster whitespace (default 32)
  --feed DOTS         Separate feed after content (default 0)
  --cut MODE          none, partial, full, feed-partial, feed-full
  --band-height DOTS  Split raster into bands; 0 means one image
  --rotate            Rotate the photo 180 degrees (enabled by default)
  --no-rotate         Disable photo rotation for diagnostics
  --dry-run PATH      Write ESC/POS bytes to PATH, do not connect or print
                      Raster jobs also write PATH.pbm for inspection
  --help              Show this help

Defaults are in printer/config.json; rotated layout approved in physical tests.
Top/bottom options describe feed order; rotation swaps their visual positions.
Probe sends no bytes. Other commands print once; no automatic retry.
Cut defaults to feed-partial. Use --cut none to suppress cutting.
TCP submission does not confirm paper output or physical completion.`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: Object.fromEntries([
      'host', 'port', 'width', 'top', 'bottom', 'feed', 'cut', 'band-height', 'dry-run',
    ].map(name => [name, { type: 'string' }]).concat([['help', { type: 'boolean' }], ['rotate', { type: 'boolean' }], ['no-rotate', { type: 'boolean' }]])),
  });
  if (values.help || positionals.length === 0) {
    console.log(help);
  } else {
    const [command] = positionals;
    if (positionals.length !== 1 || !['probe', 'text', 'pattern', 'polaroid', 'cut'].includes(command)) throw new Error('Choose probe, text, pattern, polaroid, or cut.');
    const defaults = JSON.parse(await readFile(new URL('./config.json', import.meta.url), 'utf8'));
    if (values.rotate && values['no-rotate']) throw new Error('Choose --rotate or --no-rotate, not both.');
    const rotate = values['no-rotate'] ? false : (values.rotate ?? defaults.rotate180);
    if (typeof rotate !== 'boolean') throw new Error('rotate180 must be a boolean.');
    const number = (flag, key, min, max) => integer(Number(values[flag] ?? defaults[key]), flag, min, max);
    const config = {
      host: values.host ?? defaults.host,
      port: number('port', 'port', 1, 65535),
      timeoutMs: integer(defaults.timeoutMs, 'timeoutMs', 100, 60000),
      width: number('width', 'printableWidthDots', 8, 832),
      top: number('top', 'topMarginDots', 0, 1024),
      bottom: number('bottom', 'bottomMarginDots', 0, 1024),
      feed: number('feed', 'feedDots', 0, 2048),
      bandHeight: number('band-height', 'bandHeight', 0, 4096),
      cut: values.cut ?? defaults.cut,
    };
    if (config.width % 8) throw new Error('Width must be a multiple of 8.');
    const ending = finishCommands(config.feed, config.cut);
    if (command === 'probe' && values['dry-run']) throw new Error('Probe has no print bytes to save.');
    if (command === 'cut' && config.cut === 'none') throw new Error('Use --cut partial or another explicit cut mode.');
    let raster;
    let content = Buffer.alloc(0);
    if (command === 'text') content = Buffer.from('THERMAL PHOTOBOOTH\nLAN / ESC-POS text test\n0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ\n\n', 'ascii');
    if (command === 'pattern') raster = makePattern(config.width);
    if (command === 'polaroid') raster = makePolaroid(config.width, config.top, config.bottom, rotate);
    if (raster) content = rasterCommands(raster, config.bandHeight);
    const data = Buffer.concat([initialize, content, ending]);
    if (values['dry-run']) {
      await writeFile(values['dry-run'], data);
      if (raster) await writeFile(`${values['dry-run']}.pbm`, Buffer.concat([Buffer.from(`P4\n${raster.width} ${raster.height}\n`), raster.data]));
      console.log(`Saved ${data.length} ESC/POS bytes to ${values['dry-run']}. No network connection made.`);
      if (raster) console.log(`Raster: ${raster.width} x ${raster.height}; preview: ${values['dry-run']}.pbm (printable area only).`);
    } else {
      const host = config.host;
      if (!host || net.isIP(host) !== 4 || !(
        host.startsWith('10.') || host.startsWith('192.168.') ||
        (host.startsWith('172.') && Number(host.split('.')[1]) >= 16 && Number(host.split('.')[1]) <= 31)
      )) throw new Error('Set --host to the printer’s private LAN IPv4 address (10.x, 172.16–31.x, or 192.168.x).');
      console.log(`${command === 'probe' ? 'Probing' : `Sending ${data.length} bytes to`} ${host}:${config.port}; cut=${config.cut}, extra feed=${config.feed} dots.`);
      await connectPrinter(config, command === 'probe' ? undefined : data);
      console.log(command === 'probe'
        ? 'TCP connection succeeded. No print commands sent; protocol and printer identity remain unverified.'
        : 'Submitted to TCP socket. Physical printing/completion is NOT confirmed. Inspect the receipt before retrying.');
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error('If a send failed, some bytes may have reached the printer. Check it before retrying.');
  process.exitCode = 1;
}
