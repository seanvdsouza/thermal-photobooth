import net from 'node:net';

export function connectPrinter({ host, port, timeoutMs }, data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    // Absolute deadline also covers connection establishment and slow writes.
    const timer = setTimeout(() => socket.destroy(new Error(`Printer connection timed out after ${timeoutMs} ms.`)), timeoutMs);
    let settled = false;
    function settle(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve();
    }
    socket.on('error', settle);
    socket.on('close', () => {
      if (!settled) settle(new Error('Printer closed the connection before submission finished.'));
    });
    socket.connect(port, host, () => {
      if (!data) return settle(); // Probe opens a connection, sends no commands.
      socket.end(data, () => settle());
    });
  });
}
