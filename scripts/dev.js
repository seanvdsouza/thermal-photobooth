import { spawn } from 'node:child_process';

// One command starts both local services; no process-manager dependency.
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
for (const [name, args] of [
  ['print service', ['server/index.js']],
  ['Vite', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', process.env.VITE_PORT || '5173']],
]) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  children.push(child);
  child.on('error', error => { console.error(`${name}: ${error.message}`); stop(1); });
  child.on('exit', code => { if (!stopping) { console.error(`${name} stopped.`); stop(code || 1); } });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
