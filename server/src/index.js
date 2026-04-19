require('dotenv').config();
// Registra interceptador de logs ANTES de qualquer require que produza output
const { appendLog } = require('./routes/logs');
// Inicializa o banco de dados
const { db, getSetting, findStreamKey } = require('./db');

const NodeMediaServer = require('node-media-server');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ─── Carregar Configuração ────────────────────────────────────────────────────
const CONFIG_PATH   = path.join(__dirname, '..', 'config.json');
const EXAMPLE_PATH  = path.join(__dirname, '..', 'config.example.json');

// Gera config.json automaticamente na primeira execução
if (!fs.existsSync(CONFIG_PATH)) {
  if (!fs.existsSync(EXAMPLE_PATH)) {
    console.error('[CONFIG] ERRO: config.example.json não encontrado! Reinstale o projeto.');
    process.exit(1);
  }
  fs.copyFileSync(EXAMPLE_PATH, CONFIG_PATH);
  console.log('[CONFIG] config.json criado automaticamente com valores padrão.');
  console.log('[CONFIG] Login padrão: admin / admin123');
  console.log('[CONFIG] Acesse o painel e altere a senha nas Configurações!');
}

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

let config = loadConfig();

// ─── Gerenciador de Estado do Sinal ───────────────────────────────────────────
// Estado compartilhado do sinal, transmitido via SSE para o overlay
const signalState = {
  status: 'offline',       // 'offline' | 'connecting' | 'live' | 'weak' | 'lost'
  bitrate: 0,
  streamPath: null,
  lostAt: null,
  listeners: new Set()     // objetos de resposta SSE
};

function broadcastSignal(update) {
  Object.assign(signalState, update);
  const data = JSON.stringify({
    status: signalState.status,
    bitrate: signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt: signalState.lostAt,
    ts: Date.now()
  });
  for (const res of signalState.listeners) {
    try { res.write(`data: ${data}\n\n`); } catch (_) {}
  }
  console.log(`[SINAL] status=${signalState.status} bitrate=${signalState.bitrate}`);
}

// ─── Node Media Server ─────────────────────────────────────────────────────────
const nmsConfig = {
  rtmp: {
    port: config.rtmp.port,
    chunk_size: config.rtmp.chunk_size,
    gop_cache: config.rtmp.gop_cache,
    ping: config.rtmp.ping,
    ping_timeout: config.rtmp.ping_timeout
  },
  http: {
    port: config.http.port,
    allow_origin: config.http.allow_origin,
    mediaroot: path.join(__dirname, '..', config.http.mediaroot)
  },
  auth: { play: false, publish: false }
};

const nms = new NodeMediaServer(nmsConfig);

// ─── Rastreador de Sessões (preenchido via eventos do NMS) ───────────────────
const activeSessions = new Map();
const WEAK_THRESHOLD_KBPS = 1500; // abaixo de 1.5 Mbps = sinal fraco

// SSE: clientes do dashboard que escutam status em tempo real
const statusListeners = new Set();

function broadcastStatus() {
  if (statusListeners.size === 0) return;
  const data = JSON.stringify({
    activeStreams: activeSessions.size,
    signal: {
      status: signalState.status,
      bitrate: signalState.bitrate,
      streamPath: signalState.streamPath
    },
    ts: Date.now()
  });
  for (const res of statusListeners) {
    try { res.write(`data: ${data}\n\n`); } catch (_) {}
  }
}


// ─── Autenticação + Hooks de Sinal ────────────────────────────────────────────
nms.on('prePublish', (id, StreamPath, args) => {
  const streamKey = StreamPath.split('/').pop();
  const found = findStreamKey(streamKey);

  if (!found) {
    console.log(`[AUTH] Chave rejeitada: "${streamKey}"`);
    const session = nms.getSession(id);
    if (session) session.reject();
  } else {
    console.log(`[AUTH] Chave aceita: "${streamKey}"`);
    broadcastSignal({ status: 'connecting', streamPath: StreamPath });
  }
});

nms.on('postPublish', (id, StreamPath) => {
  console.log(`[NMS] Stream iniciado: ${StreamPath}`);
  const session = { id, StreamPath, startedAt: Date.now(), startedAtISO: new Date().toISOString() };
  activeSessions.set(id, session);
  broadcastSignal({ status: 'live', streamPath: StreamPath, lostAt: null });
  broadcastStatus();
});

nms.on('donePublish', (id, StreamPath) => {
  console.log(`[NMS] Stream encerrado: ${StreamPath}`);
  const session = activeSessions.get(id);
  activeSessions.delete(id);

  // Registra no histórico
  try {
    const { recordSession } = require('./routes/history');
    const dur = session ? Math.floor((Date.now() - session.startedAt) / 1000) : null;
    recordSession({
      streamPath: StreamPath,
      startedAt: session?.startedAtISO || null,
      endedAt: new Date().toISOString(),
      durationSeconds: dur
    });
  } catch (_) {}

  // Mantém status 'lost' indefinidamente até o stream reconectar
  broadcastSignal({ status: 'lost', streamPath: StreamPath, lostAt: new Date().toISOString(), bitrate: 0 });
  broadcastStatus();
});

// ─── Weak-signal detection: poll bitrate every 2s ───────────────────────────

setInterval(() => {
  if (signalState.status !== 'live' && signalState.status !== 'weak') return;
  if (activeSessions.size === 0) return;

  activeSessions.forEach((info, id) => {
    const session = nms.getSession(id);
    if (!session) { activeSessions.delete(id); return; }

    // session.bitrate é atualizado pelo NMS a cada 1s via onSocketData
    const bitrateKbps = typeof session.bitrate === 'number' ? session.bitrate : 0;
    if (bitrateKbps <= 0) return; // ainda não calculou (primeiros segundos)

    const prevStatus = signalState.status;
    const isWeak = bitrateKbps < WEAK_THRESHOLD_KBPS;
    const newStatus = isWeak ? 'weak' : 'live';

    // Sempre faz broadcast — atualiza bitrate em tempo real no dashboard
    // e muda o status quando necessário
    if (newStatus !== prevStatus || bitrateKbps !== signalState.bitrate) {
      broadcastSignal({ status: newStatus, bitrate: bitrateKbps });
      broadcastStatus();
    }
  });
}, 2000);

nms.run();
console.log(`[NMS] Servidor RTMP rodando na porta ${config.rtmp.port}`);
console.log(`[NMS] Servidor HTTP rodando na porta ${config.http.port}`);

// ─── API REST (Express) ────────────────────────────────────────────────────────
const { router: authRouter } = require('./routes/auth');
const keysRouter   = require('./routes/keys');
const configRouter = require('./routes/config');
const statusRouter = require('./routes/status');
const obsRouter    = require('./routes/obs');
const { router: historyRouter } = require('./routes/history');
const { router: logsRouter }    = require('./routes/logs');

const app = express();
const API_PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Servir overlay HTML (público, sem autenticação) ─────────────────────────
const OVERLAY_DIR = path.join(__dirname, '..', 'overlay');
app.use('/overlay', express.static(OVERLAY_DIR));

// ─── SSE: Eventos de sinal para o overlay ─────────────────────────────────────
// GET /signal/events  (sem auth — o overlay no OBS não tem token)
app.get('/signal/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Envia o estado atual imediatamente ao conectar
  const current = JSON.stringify({
    status: signalState.status,
    bitrate: signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt: signalState.lostAt,
    ts: Date.now()
  });
  res.write(`data: ${current}\n\n`);

  signalState.listeners.add(res);

  req.on('close', () => {
    signalState.listeners.delete(res);
  });
});

// GET /signal/status  (protegido — dashboard faz polling/SSE)
app.get('/signal/status', (req, res) => {
  res.json({
    status: signalState.status,
    bitrate: signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt: signalState.lostAt
  });
});

// GET /api/status/events — SSE do dashboard (estado global do servidor)
app.get('/api/status/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const current = JSON.stringify({
    activeStreams: activeSessions.size,
    signal: {
      status: signalState.status,
      bitrate: signalState.bitrate,
      streamPath: signalState.streamPath
    },
    ts: Date.now()
  });
  res.write(`data: ${current}\n\n`);

  statusListeners.add(res);
  req.on('close', () => statusListeners.delete(res));
});

// Rotas públicas
app.use('/api/auth', authRouter);

// Rotas protegidas (JWT obrigatório)
const { verifyToken } = require('./middleware/auth');
app.use('/api/keys',    verifyToken, keysRouter);
app.use('/api/config',  verifyToken, configRouter);
app.use('/api/status',  verifyToken, statusRouter);
app.use('/api/obs',     verifyToken, obsRouter);
app.use('/api/history', verifyToken, historyRouter);
app.use('/api/logs',    verifyToken, logsRouter);

// ─── Em produção (Docker), serve o dashboard React buildado ──────────────────
// Em desenvolvimento o Vite roda separado na porta 5173
if (process.env.NODE_ENV === 'production') {
  const DASHBOARD_DIST = path.join(__dirname, '..', '..', 'dashboard', 'dist');
  if (fs.existsSync(DASHBOARD_DIST)) {
    app.use(express.static(DASHBOARD_DIST));
    // SPA fallback: qualquer rota não reconhecida retorna o index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(DASHBOARD_DIST, 'index.html'));
    });
    console.log(`[DASHBOARD] Servindo dashboard buildado em http://localhost:${API_PORT}`);
  }
}

app.listen(API_PORT, () => {
  console.log(`[API] API de gerenciamento rodando na porta ${API_PORT}`);
  console.log(`[OVERLAY] Disponível em http://localhost:${API_PORT}/overlay/`);
  console.log(`[SSE] Eventos de sinal em http://localhost:${API_PORT}/signal/events`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Dashboard de desenvolvimento em http://localhost:5173`);
  }
});

module.exports = { nms, app, loadConfig, saveConfig, signalState, broadcastSignal, broadcastStatus, activeSessions };
