/**
 * streamManager.js — Gerenciador desacoplado de sessões e saúde do sinal IRL
 * Elimina dependências circulares e fornece cálculo estável de bitrate com média móvel.
 */

const { recordSession } = require('../routes/history');

const WEAK_THRESHOLD_KBPS = 1500;

// Estado central do sinal
const signalState = {
  status: 'offline', // 'offline' | 'connecting' | 'live' | 'weak' | 'lost'
  bitrate: 0,
  smoothedBitrate: 0,
  streamPath: null,
  lostAt: null,
  listeners: new Set()
};

// Histórico de bitrate para média móvel simples (últimos 3 checkpoints)
const bitrateHistory = [];
const MAX_SAMPLES = 3;

// Sessões ativas
const activeSessions = new Map();
const statusListeners = new Set();

function broadcastSignal(update = {}) {
  Object.assign(signalState, update);
  const data = JSON.stringify({
    status:     signalState.status,
    bitrate:    signalState.bitrate,
    streamPath: signalState.streamPath,
    lostAt:     signalState.lostAt,
    ts:         Date.now()
  });

  for (const res of signalState.listeners) {
    try { res.write(`data: ${data}\n\n`); } catch (_) {}
  }
}

function broadcastStatus() {
  if (statusListeners.size === 0) return;
  const data = JSON.stringify({
    activeStreams: activeSessions.size,
    signal: {
      status:     signalState.status,
      bitrate:    signalState.bitrate,
      streamPath: signalState.streamPath
    },
    ts: Date.now()
  });

  for (const res of statusListeners) {
    try { res.write(`data: ${data}\n\n`); } catch (_) {}
  }
}

function handlePrePublish(id, streamPath) {
  broadcastSignal({ status: 'connecting', streamPath });
}

function handlePostPublish(id, streamPath) {
  const now = Date.now();
  const session = {
    id,
    streamPath,
    startedAt: now,
    startedAtISO: new Date(now).toISOString()
  };
  activeSessions.set(id, session);
  bitrateHistory.length = 0;

  broadcastSignal({
    status: 'live',
    streamPath,
    lostAt: null,
    bitrate: 0
  });
  broadcastStatus();
}

function handleDonePublish(id, streamPath) {
  const session = activeSessions.get(id);
  activeSessions.delete(id);
  bitrateHistory.length = 0;

  try {
    const dur = session ? Math.floor((Date.now() - session.startedAt) / 1000) : null;
    recordSession({
      streamPath,
      startedAt:       session?.startedAtISO || null,
      endedAt:         new Date().toISOString(),
      durationSeconds: dur
    });
  } catch (err) {
    console.error('[SESSÃO] Erro ao registrar histórico:', err);
  }

  broadcastSignal({
    status: 'lost',
    streamPath,
    lostAt: new Date().toISOString(),
    bitrate: 0
  });
  broadcastStatus();
}

/**
 * Avalia o bitrate das sessões e atualiza o estado com debounce/moving average
 */
function evaluateBitrates(nms) {
  if (signalState.status !== 'live' && signalState.status !== 'weak') return;
  if (activeSessions.size === 0) return;

  activeSessions.forEach((info, id) => {
    const session = nms?.getSession(id);
    if (!session) {
      activeSessions.delete(id);
      return;
    }

    const currentBitrate = typeof session.bitrate === 'number' ? session.bitrate : 0;
    if (currentBitrate <= 0) return;

    bitrateHistory.push(currentBitrate);
    if (bitrateHistory.length > MAX_SAMPLES) bitrateHistory.shift();

    const avgBitrate = Math.round(
      bitrateHistory.reduce((a, b) => a + b, 0) / bitrateHistory.length
    );

    const prevStatus = signalState.status;
    const newStatus  = avgBitrate < WEAK_THRESHOLD_KBPS ? 'weak' : 'live';

    if (newStatus !== prevStatus || avgBitrate !== signalState.bitrate) {
      broadcastSignal({ status: newStatus, bitrate: avgBitrate });
      broadcastStatus();
    }
  });
}

function getActiveSessionsList() {
  const list = [];
  activeSessions.forEach((session, id) => {
    list.push({
      id,
      path: session.streamPath,
      startTime: session.startedAtISO || null
    });
  });
  return list;
}

module.exports = {
  signalState,
  activeSessions,
  statusListeners,
  broadcastSignal,
  broadcastStatus,
  handlePrePublish,
  handlePostPublish,
  handleDonePublish,
  evaluateBitrates,
  getActiveSessionsList
};
