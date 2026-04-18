const express = require('express');
const router = express.Router();

// Buffer em memória — últimas 500 linhas de log
const LOG_BUFFER_SIZE = 500;
const logBuffer = [];
const logListeners = new Set();

const LEVELS = { info: 'INFO', warn: 'WARN', error: 'ERROR', success: 'OK' };

function appendLog(level, source, message) {
  const entry = {
    id: Date.now() + Math.random(),
    ts: new Date().toISOString(),
    level: LEVELS[level] || 'INFO',
    source,
    message: String(message)
  };
  logBuffer.push(entry);
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();

  const data = JSON.stringify(entry);
  for (const res of logListeners) {
    try { res.write(`data: ${data}\n\n`); } catch (_) {}
  }
}

// Intercepta console.log / warn / error do processo Node
const _origLog   = console.log.bind(console);
const _origWarn  = console.warn.bind(console);
const _origError = console.error.bind(console);

function parseSource(msg) {
  const match = String(msg).match(/^\[([^\]]+)\]/);
  return match ? match[1] : 'SERVER';
}

console.log = (...args) => {
  _origLog(...args);
  const msg = args.join(' ');
  // Filtra linhas muito ruidosas do NMS interno
  if (msg.includes('NodeMediaServer') && msg.includes('v2')) return;
  appendLog('info', parseSource(msg), msg);
};
console.warn = (...args) => {
  _origWarn(...args);
  const msg = args.join(' ');
  appendLog('warn', parseSource(msg), msg);
};
console.error = (...args) => {
  _origError(...args);
  const msg = args.join(' ');
  appendLog('error', parseSource(msg), msg);
};

/**
 * GET /api/logs/events  — SSE stream de logs em tempo real
 */
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia os últimos 100 logs imediatamente ao conectar
  const recent = logBuffer.slice(-100);
  for (const entry of recent) {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  }

  logListeners.add(res);
  req.on('close', () => logListeners.delete(res));
});

/**
 * GET /api/logs  — snapshot do buffer atual (sem SSE)
 */
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  res.json({ logs: logBuffer.slice(-limit), total: logBuffer.length });
});

module.exports = { router, appendLog };
