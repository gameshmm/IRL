require('dotenv').config();

// Registra interceptador de logs ANTES de qualquer require que produza output
const { appendLog } = require('./routes/logs');

const NodeMediaServer = require('node-media-server');
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const { initDb, findStreamKey } = require('./db');
const {
  signalState,
  activeSessions,
  statusListeners,
  handlePrePublish,
  handlePostPublish,
  handleDonePublish,
  evaluateBitrates
} = require('./services/streamManager');

// ─── Carregar Configuração ────────────────────────────────────────────────────
const CONFIG_PATH  = path.join(__dirname, '..', 'config.json');
const EXAMPLE_PATH = path.join(__dirname, '..', 'config.example.json');

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
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

const config = loadConfig();

// ─── Node Media Server ────────────────────────────────────────────────────────
const nmsConfig = {
  rtmp: {
    port:         config.rtmp.port,
    chunk_size:   config.rtmp.chunk_size,
    gop_cache:    config.rtmp.gop_cache,
    ping:         config.rtmp.ping,
    ping_timeout: config.rtmp.ping_timeout
  },
  http: {
    port:         config.http.port,
    allow_origin: config.http.allow_origin,
    mediaroot:    path.join(__dirname, '..', config.http.mediaroot)
  },
  auth: { play: false, publish: false }
};

const nms = new NodeMediaServer(nmsConfig);

// ─── Hooks NMS ────────────────────────────────────────────────────────────────
nms.on('prePublish', (id, StreamPath) => {
  const streamKey = StreamPath.split('/').pop();
  const found = findStreamKey(streamKey);

  if (!found) {
    console.log(`[AUTH] Chave rejeitada: "${streamKey}"`);
    const session = nms.getSession(id);
    if (session) session.reject();
  } else {
    console.log(`[AUTH] Chave aceita: "${streamKey}"`);
    handlePrePublish(id, StreamPath);
  }
});

nms.on('postPublish', (id, StreamPath) => {
  console.log(`[NMS] Stream iniciado: ${StreamPath}`);
  handlePostPublish(id, StreamPath);
});

nms.on('donePublish', (id, StreamPath) => {
  console.log(`[NMS] Stream encerrado: ${StreamPath}`);
  handleDonePublish(id, StreamPath);
});

// Detecção estável de sinal fraco / bitrate
setInterval(() => {
  evaluateBitrates(nms);
}, 2000);

// ─── Express App ──────────────────────────────────────────────────────────────
const app      = express();
const API_PORT = process.env.API_PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Overlay estático (sem autenticação)
const OVERLAY_DIR = path.join(__dirname, '..', 'overlay');
app.use('/overlay', express.static(OVERLAY_DIR));

// SSE: sinal para overlay
app.get('/signal/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Envia estado atual imediatamente
  res.write(`data: ${JSON.stringify({
    status:     signalState.status,
    bitrate:    signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt:     signalState.lostAt,
    ts:         Date.now()
  })}\n\n`);

  signalState.listeners.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    signalState.listeners.delete(res);
  });
});

app.get('/signal/status', (req, res) => {
  res.json({
    status:     signalState.status,
    bitrate:    signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt:     signalState.lostAt
  });
});

// SSE: status global do dashboard
app.get('/api/status/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({
    activeStreams: activeSessions.size,
    signal: {
      status:     signalState.status,
      bitrate:    signalState.bitrate,
      streamPath: signalState.streamPath
    },
    ts: Date.now()
  })}\n\n`);

  statusListeners.add(res);
  req.on('close', () => statusListeners.delete(res));
});

// ─── Rotas ───────────────────────────────────────────────────────────────────
const { router: authRouter }    = require('./routes/auth');
const keysRouter                = require('./routes/keys');
const configRouter              = require('./routes/config');
const statusRouter              = require('./routes/status');
const obsRouter                 = require('./routes/obs');
const { router: historyRouter } = require('./routes/history');
const { router: logsRouter }    = require('./routes/logs');
const youtubeRouter             = require('./routes/youtube');
const { verifyToken }           = require('./middleware/auth');

// Rotas públicas
app.use('/api/auth', authRouter);

// Rotas protegidas
app.use('/api/keys',    verifyToken, keysRouter);
app.use('/api/config',  verifyToken, configRouter);
app.use('/api/status',  verifyToken, statusRouter);
app.use('/api/obs',     verifyToken, obsRouter);
app.use('/api/history', verifyToken, historyRouter);
app.use('/api/logs',    verifyToken, logsRouter);
app.use('/api/youtube', verifyToken, youtubeRouter);

// Em produção: serve o dashboard buildado
if (process.env.NODE_ENV === 'production') {
  const DASHBOARD_DIST = path.join(__dirname, '..', '..', 'dashboard', 'dist');
  if (fs.existsSync(DASHBOARD_DIST)) {
    app.use(express.static(DASHBOARD_DIST));
    app.get('*', (req, res) => res.sendFile(path.join(DASHBOARD_DIST, 'index.html')));
    console.log(`[DASHBOARD] Servindo dashboard em http://localhost:${API_PORT}`);
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
(async () => {
  await initDb();

  nms.run();
  console.log(`[NMS] Servidor RTMP rodando na porta ${config.rtmp.port}`);
  console.log(`[NMS] Servidor HTTP rodando na porta ${config.http.port}`);

  app.listen(API_PORT, () => {
    console.log(`[API] API de gerenciamento rodando na porta ${API_PORT}`);
    console.log(`[OVERLAY] Disponível em http://localhost:${API_PORT}/overlay/`);
    console.log(`[SSE] Eventos de sinal em http://localhost:${API_PORT}/signal/events`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Dashboard de desenvolvimento em http://localhost:5173`);
    }
  });
})().catch(err => {
  console.error('[FATAL] Erro ao iniciar o servidor:', err);
  process.exit(1);
});

module.exports = { app, nms, loadConfig, saveConfig };
